import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Play, Shield, Menu, X, Search, Plus, Trash2, Edit2, Save, LogOut, Loader2, AlertCircle, Lock, Check, Eye, ThumbsUp, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from './firebase';
import { cn, getUserIp } from './lib/utils';
import { Video, Category, MenuItem, SiteConfig, CATEGORIES } from './types';

// --- Components ---

declare global {
  interface Window {
    Playerjs: any;
  }
}

const PlayerJS: React.FC<{ 
  id: string; 
  file: string; 
  poster?: string; 
  autoplay?: boolean; 
  muted?: boolean;
  hideControls?: boolean;
  className?: string;
}> = ({ id, file, poster, autoplay, muted, hideControls, className }) => {
  useEffect(() => {
    let player: any = null;
    const initPlayer = () => {
      if (window.Playerjs) {
        player = new window.Playerjs({
          id: id,
          file: file,
          poster: poster,
          autoplay: autoplay ? 1 : 0,
          muted: muted ? 1 : 0,
          controls: hideControls ? 0 : 1,
          controlbar: hideControls ? 0 : 1,
          ui: hideControls ? 0 : 1,
          interface: hideControls ? 0 : 1,
        });
      }
    };

    // Small delay to ensure the div is in the DOM
    const timer = setTimeout(initPlayer, 100);

    return () => {
      clearTimeout(timer);
      if (player && typeof player.destroy === 'function') {
        player.destroy();
      } else {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
      }
    };
  }, [id, file, poster, autoplay, muted, hideControls]);

  return <div id={id} className={cn("aspect-video bg-black", hideControls && "pointer-events-none", className)}></div>;
};

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const qMenu = query(collection(db, 'menuItems'), orderBy('order', 'asc'));
    const unsubMenu = onSnapshot(qMenu, (snap) => {
      setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));
    });

    const qCat = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubCat = onSnapshot(qCat, (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    });

    const unsubConfig = onSnapshot(doc(db, 'siteConfig', 'main'), (snap) => {
      if (snap.exists()) {
        setSiteConfig({ id: snap.id, ...snap.data() } as SiteConfig);
      }
    });

    return () => { unsubMenu(); unsubCat(); unsubConfig(); };
  }, []);

  const mainMenuItems = menuItems.filter(item => !item.parentId);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to={siteConfig?.logoLink || "/"} className="flex items-center space-x-2">
            <div className="bg-brand p-1.5 rounded-lg">
              {siteConfig?.logoUrl ? (
                <img src={siteConfig.logoUrl} alt="Logo" className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
              ) : (
                <Play className="w-6 h-6 text-white fill-current" />
              )}
            </div>
            <span className="text-2xl font-black tracking-tighter text-gray-900 uppercase italic">
              {siteConfig?.logoText || 'VidBoyz'}
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-sm font-semibold text-gray-600 hover:text-brand transition-colors">Home</Link>
            
            {mainMenuItems.map(item => {
              const children = menuItems.filter(child => child.parentId === item.id);
              if (children.length > 0) {
                return (
                  <div 
                    key={item.id} 
                    className="relative group"
                    onMouseEnter={() => setActiveDropdown(item.id)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <button className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-brand transition-colors">
                      {item.label}
                      <Menu className="w-3 h-3" />
                    </button>
                    <AnimatePresence>
                      {activeDropdown === item.id && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl py-2 z-50"
                        >
                          {children.map(child => (
                            <Link 
                              key={child.id} 
                              to={child.link} 
                              className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-brand transition-colors"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }
              return (
                <Link key={item.id} to={item.link} className="text-sm font-semibold text-gray-600 hover:text-brand transition-colors">
                  {item.label}
                </Link>
              );
            })}

            <div className="relative group" onMouseEnter={() => setActiveDropdown('categories')} onMouseLeave={() => setActiveDropdown(null)}>
              <button className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-brand transition-colors">
                Categories
                <Menu className="w-3 h-3" />
              </button>
              <AnimatePresence>
                {activeDropdown === 'categories' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl py-2 z-50"
                  >
                    {categories.map(cat => (
                      <Link 
                        key={cat.id} 
                        to={`/category/${cat.slug}`} 
                        className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-brand transition-colors"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link to="/admin" className="p-2 text-gray-400 hover:text-brand transition-colors">
              <Shield className="w-5 h-5" />
            </Link>
          </div>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-gray-600">
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              <Link to="/" className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md">Home</Link>
              {mainMenuItems.map(item => (
                <Link key={item.id} to={item.link} className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                  {item.label}
                </Link>
              ))}
              <div className="pt-2 pb-1 border-t border-gray-50">
                <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Categories</p>
                {categories.map(cat => (
                  <Link key={cat.id} to={`/category/${cat.slug}`} className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                    {cat.name}
                  </Link>
                ))}
              </div>
              <Link to="/admin" className="block px-3 py-2 text-base font-medium text-brand hover:bg-red-50 rounded-md">Admin Panel</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

const getAutoPoster = (video: Video) => {
  if (video.posterUrl) return video.posterUrl;
  if (video.isIframe) {
    // Try to extract YouTube ID
    const ytMatch = video.videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    
    // Try to extract Vimeo ID
    const vimeoMatch = video.videoUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
  }
  return null;
};

const VideoCard: React.FC<{ video: Video; siteConfig?: SiteConfig | null }> = ({ video, siteConfig }) => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const autoPoster = getAutoPoster(video);

  const showViews = (siteConfig?.viewsEnabled ?? true) && (siteConfig?.viewsOnHomeEnabled ?? true);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center"
    >
      <Link to={`/video/${video.id}`} className="block relative aspect-video overflow-hidden w-full bg-black">
        {isHovered ? (
          <PlayerJS 
            id={`preview-${video.id}`}
            file={video.videoUrl}
            autoplay={true}
            muted={true}
            hideControls={true}
            className="w-full h-full"
          />
        ) : (
          <>
            {autoPoster ? (
              <img
                src={autoPoster}
                alt={video.title || 'Video'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            ) : (
              !video.isIframe ? (
                <video
                  src={`${video.videoUrl}#t=1`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  preload="metadata"
                  muted
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <Play className="w-12 h-12 text-gray-300" />
                </div>
              )
            )}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="bg-brand p-4 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                <Play className="w-8 h-8 text-white fill-current" />
              </div>
            </div>
          </>
        )}
        <div className="absolute bottom-2 right-2 flex gap-2 flex-wrap justify-end max-w-[80%]">
          {showViews && (
            <div className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {video.views || 0}
            </div>
          )}
          {video.categories && Array.isArray(video.categories) && video.categories.length > 0 ? (
            video.categories.map((cat, idx) => (
              <div key={`${cat}-${idx}`} className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                {cat}
              </div>
            ))
          ) : (
            <div className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
              {video.category || 'Other'}
            </div>
          )}
        </div>
      </Link>
      <div className="p-5 w-full flex flex-col items-center">
        {video.title && (
          <h3 className="text-lg font-bold text-gray-900 line-clamp-1 group-hover:text-brand transition-colors">
            {video.title}
          </h3>
        )}
        {video.description && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2 leading-relaxed">
            {video.description}
          </p>
        )}
        {video.tags && video.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {Array.from(new Set(video.tags.map(t => t.trim()).filter(Boolean))).map((tag: any) => (
              <button
                key={tag}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`/?search=${encodeURIComponent(tag)}`);
                }}
                className="text-[10px] font-bold text-gray-400 hover:text-brand transition-colors uppercase tracking-widest cursor-pointer"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// --- Pages ---

function HomePage() {
  const { category } = useParams<{ category?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParam = searchParams.get('search') || searchParams.get('tag') || '';

  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParam);

  useEffect(() => {
    setSearch(searchParam);
  }, [searchParam]);

  useEffect(() => {
    const qVids = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    const unsubVids = onSnapshot(qVids, (snapshot) => {
      const vids = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Video));
      setVideos(vids);
      setLoading(false);
    });

    const qCats = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubCats = onSnapshot(qCats, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });

    const unsubConfig = onSnapshot(doc(db, 'siteConfig', 'main'), (snap) => {
      if (snap.exists()) {
        setSiteConfig({ id: snap.id, ...snap.data() } as SiteConfig);
      }
    });

    return () => { unsubVids(); unsubCats(); unsubConfig(); };
  }, []);

  const activeCategory = categories.find(c => c.slug === category);

  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const matchesCategory = !category || 
        (v.categories && Array.isArray(v.categories) ? v.categories.includes(activeCategory?.name || '') : v.category === activeCategory?.name);
      const matchesSearch = !search || 
        (v.title?.toLowerCase().includes(search.toLowerCase())) || 
        (v.tags?.some(t => t.toLowerCase().includes(search.toLowerCase())));
      return matchesCategory && matchesSearch;
    });
  }, [videos, category, search, activeCategory]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col items-center text-center mb-12 gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 uppercase italic leading-none">
            {activeCategory ? (
              <>{activeCategory.name} <span className="text-brand">Drops</span></>
            ) : (
              siteConfig?.heroTitle ? (
                siteConfig.heroTitle.split(' ').map((word, i, arr) => (
                  <span key={i} className={i === arr.length - 1 ? 'text-brand' : ''}>
                    {word}{' '}
                  </span>
                ))
              ) : (
                <>Latest <span className="text-brand">Drops</span></>
              )
            )}
          </h1>
          <p className="mt-4 text-gray-500 font-medium text-lg">{siteConfig?.heroSubtitle || 'The freshest content on the web.'}</p>
        </div>
        <div className="relative group w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand transition-colors" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              const val = e.target.value;
              setSearch(val);
              if (val) {
                setSearchParams({ search: val });
              } else {
                setSearchParams({});
              }
            }}
            placeholder="Search videos..."
            className="pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl w-full focus:ring-2 focus:ring-brand/20 transition-all outline-none font-medium text-center"
          />
        </div>
      </div>

      {filteredVideos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredVideos.map(video => (
            <VideoCard key={video.id} video={video} siteConfig={siteConfig} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <div className="inline-block bg-gray-50 p-6 rounded-full mb-6">
            <Search className="w-12 h-12 text-gray-300" />
          </div>
          <h3 className="text-2xl font-black uppercase italic tracking-tight text-gray-900">No videos <span className="text-brand">found</span></h3>
          <p className="mt-4 text-gray-500 font-medium max-w-md mx-auto">
            {search ? `We couldn't find any videos matching "${search}".` : "Your database is currently empty. Head to the Admin Panel to restore the sample content!"}
          </p>
          {!search && (
            <Link to="/admin" className="mt-8 inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-black px-8 py-4 rounded-2xl shadow-lg shadow-brand/20 transition-all uppercase tracking-widest italic">
              Go to Admin Panel
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

const RelatedVideoCard: React.FC<{ video: Video }> = ({ video }) => {
  const [isHovered, setIsHovered] = useState(false);
  const autoPoster = getAutoPoster(video);

  return (
    <Link 
      to={`/video/${video.id}`} 
      className="flex gap-4 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative w-32 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-black">
        {isHovered ? (
          <PlayerJS 
            id={`related-preview-${video.id}`}
            file={video.videoUrl}
            autoplay={true}
            muted={true}
            hideControls={true}
            className="w-full h-full"
          />
        ) : (
          <>
            {autoPoster ? (
              <img src={autoPoster} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              !video.isIframe ? (
                <video
                  src={`${video.videoUrl}#t=1`}
                  className="w-full h-full object-cover"
                  preload="metadata"
                  muted
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <Play className="w-4 h-4 text-gray-300" />
                </div>
              )
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-4 h-4 text-white fill-current" />
            </div>
          </>
        )}
      </div>
      <div>
        <h4 className="font-bold text-gray-900 line-clamp-1 group-hover:text-brand transition-colors">{video.title}</h4>
        <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-wider">
          {video.categories && Array.isArray(video.categories) && video.categories.length > 0 
            ? video.categories.join(', ') 
            : (video.category || 'Other')}
        </p>
      </div>
    </Link>
  );
};

function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Video | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  
  // Ad States
  const [showAd, setShowAd] = useState(false);
  const [adRemaining, setAdRemaining] = useState(0);
  const [skipRemaining, setSkipRemaining] = useState(0);
  const [adFinished, setAdFinished] = useState(false);

  // Interaction States
  const [hasLiked, setHasLiked] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userIp, setUserIp] = useState('');

  useEffect(() => {
    if (!id) return;
    
    // Check if favorite
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    setIsFavorite(favorites.some((v: any) => v.id === id));

    // Reset ad state when video changes
    setShowAd(false);
    setAdFinished(false);

    const fetchVideo = async () => {
      const docRef = doc(db, 'videos', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setVideo({ id: docSnap.id, ...docSnap.data() } as Video);
      }
      setLoading(false);
    };
    fetchVideo();

    const trackView = async () => {
      const ip = await getUserIp();
      setUserIp(ip);
      
      const interactionId = `${id}_${ip.replace(/\./g, '_')}`;
      const interactionRef = doc(db, 'interactions', interactionId);
      const interactionSnap = await getDoc(interactionRef);
      
      if (!interactionSnap.exists()) {
        // New view
        await setDoc(interactionRef, {
          videoId: id,
          ip: ip,
          type: 'view',
          createdAt: Date.now()
        });
        await updateDoc(doc(db, 'videos', id), {
          views: increment(1)
        });
      }
      
      // Check for like
      const likeId = `like_${id}_${ip.replace(/\./g, '_')}`;
      const likeSnap = await getDoc(doc(db, 'interactions', likeId));
      setHasLiked(likeSnap.exists());
    };
    trackView();

    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vids = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Video));
      setRelatedVideos(vids.filter(v => v.id !== id).slice(0, 5));
    });

    const unsubConfig = onSnapshot(doc(db, 'siteConfig', 'main'), (snap) => {
      if (snap.exists()) {
        const config = snap.data() as SiteConfig;
        setSiteConfig(config);
        
        // Trigger ad if enabled
        if (config.adsEnabled && !adFinished) {
          setShowAd(true);
          setAdRemaining(config.adDuration || 15);
          setSkipRemaining(config.adSkipDelay || 5);
        }
      }
    });

    return () => {
      unsubscribe();
      unsubConfig();
    };
  }, [id]);

  const handleLike = async () => {
    if (!id || !userIp) return;
    const likeId = `like_${id}_${userIp.replace(/\./g, '_')}`;
    const likeRef = doc(db, 'interactions', likeId);
    
    try {
      if (hasLiked) {
        // Unlike
        await deleteDoc(likeRef);
        await updateDoc(doc(db, 'videos', id), {
          likes: increment(-1)
        });
        setHasLiked(false);
        setVideo(prev => prev ? { ...prev, likes: (prev.likes || 1) - 1 } : null);
      } else {
        // Like
        await setDoc(likeRef, {
          videoId: id,
          ip: userIp,
          type: 'like',
          createdAt: Date.now()
        });
        await updateDoc(doc(db, 'videos', id), {
          likes: increment(1)
        });
        setHasLiked(true);
        setVideo(prev => prev ? { ...prev, likes: (prev.likes || 0) + 1 } : null);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const toggleFavorite = () => {
    if (!video) return;
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    let newFavorites;
    if (isFavorite) {
      newFavorites = favorites.filter((v: any) => v.id !== video.id);
    } else {
      newFavorites = [...favorites, { id: video.id, title: video.title, posterUrl: video.posterUrl, videoUrl: video.videoUrl }];
    }
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
    window.dispatchEvent(new Event('favoritesChanged'));
  };

  // Ad Timer Logic
  useEffect(() => {
    let timer: any;
    if (showAd && adRemaining > 0) {
      timer = setInterval(() => {
        setAdRemaining(prev => {
          if (prev <= 1) {
            setShowAd(false);
            setAdFinished(true);
            return 0;
          }
          return prev - 1;
        });
        setSkipRemaining(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showAd, adRemaining]);

  const handleSkipAd = () => {
    if (skipRemaining === 0) {
      setShowAd(false);
      setAdFinished(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand animate-spin" />
      </div>
    );
  }

  if (!video) return <div className="text-center py-20">Video not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-black rounded-3xl overflow-hidden shadow-2xl video-aspect mb-8 relative">
        {!showAd ? (
          <PlayerJS 
            id={`player-${video.id}`}
            file={video.videoUrl}
            poster={getAutoPoster(video) || `${video.videoUrl}#t=1`}
            className="w-full h-full"
          />
        ) : (
          <div className="absolute inset-0 z-10 bg-black flex items-center justify-center">
            {siteConfig?.adType === 'video' ? (
              <PlayerJS 
                id="ad-player"
                file={siteConfig.adVideoUrl || ''}
                autoplay={true}
                muted={false}
                className="w-full h-full"
              />
            ) : (
              <a href={siteConfig?.adLink} target="_blank" rel="noopener noreferrer" className="w-full h-full relative group">
                <img 
                  src={siteConfig?.adImageUrl || 'https://picsum.photos/seed/ads/1920/1080'} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
              </a>
            )}
            
            {/* Ad Info Overlay */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl text-white text-xs font-bold uppercase tracking-widest border border-white/10">
              Ad • {adRemaining}s
            </div>

            {/* Skip Button */}
            <div className="absolute bottom-12 right-0">
              <button 
                onClick={handleSkipAd}
                disabled={skipRemaining > 0}
                className={cn(
                  "flex items-center gap-3 px-8 py-4 font-black uppercase italic tracking-widest transition-all",
                  skipRemaining > 0 
                    ? "bg-black/60 text-white/50 cursor-not-allowed" 
                    : "bg-white text-black hover:bg-brand hover:text-white"
                )}
              >
                {skipRemaining > 0 ? `Skip in ${skipRemaining}` : "Skip Ad"}
                <Play className="w-4 h-4 fill-current" />
              </button>
            </div>

            {/* Visit Link Overlay (for video ads) */}
            {siteConfig?.adType === 'video' && siteConfig?.adLink && (
              <a 
                href={siteConfig.adLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="absolute bottom-12 left-8 bg-brand text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-brand/20 hover:scale-105 transition-transform"
              >
                Visit Website
              </a>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic">
            {video.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <div className="flex flex-wrap items-center gap-2">
              {video.categories && Array.isArray(video.categories) && video.categories.length > 0 ? (
                video.categories.map((cat, idx) => (
                  <span key={`${cat}-${idx}`} className="bg-brand/10 text-brand text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {cat}
                  </span>
                ))
              ) : (
                <span className="bg-brand/10 text-brand text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {video.category || 'Other'}
                </span>
              )}
              <span className="text-gray-400 text-sm font-medium ml-2">
                Uploaded {new Date(video.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            <div className="flex items-center gap-6 border-l border-gray-100 pl-6">
              {(siteConfig?.viewsEnabled ?? true) && (siteConfig?.viewsOnDetailEnabled ?? true) && (
                <div className="flex items-center gap-2 text-gray-500 font-bold text-sm">
                  <Eye className="w-4 h-4" />
                  {video.views || 0}
                </div>
              )}
              {(siteConfig?.likesEnabled ?? true) && (
                <button 
                  onClick={handleLike}
                  className={cn(
                    "flex items-center gap-2 font-bold text-sm transition-all",
                    hasLiked ? "text-brand scale-110" : "text-gray-500 hover:text-brand"
                  )}
                >
                  <ThumbsUp className={cn("w-4 h-4", hasLiked && "fill-current")} />
                  {video.likes || 0}
                </button>
              )}
              <button 
                onClick={toggleFavorite}
                className={cn(
                  "flex items-center gap-2 font-bold text-sm transition-all",
                  isFavorite ? "text-red-500 scale-110" : "text-gray-500 hover:text-red-500"
                )}
              >
                <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
                {isFavorite ? 'Favorited' : 'Favorite'}
              </button>
            </div>
          </div>
          <div className="mt-8 prose prose-gray max-w-none">
            <p className="text-gray-600 text-lg leading-relaxed">
              {video.description}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {Array.from(new Set((video.tags || []).map(t => t.trim()).filter(Boolean))).map((tag: any) => (
              <button
                key={tag}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`/?search=${encodeURIComponent(tag)}`);
                }}
                className="bg-gray-100 hover:bg-brand/10 hover:text-brand transition-all text-gray-500 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest cursor-pointer"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Up Next</h3>
          {relatedVideos.map(v => (
            <RelatedVideoCard key={v.id} video={v} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState<'videos' | 'categories' | 'menu' | 'config'>('videos');
  
  // Data States
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);

  // Edit States
  const [editingVideo, setEditingVideo] = useState<Partial<Video> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [editingMenuItem, setEditingMenuItem] = useState<Partial<MenuItem> | null>(null);
  const [editingConfig, setEditingConfig] = useState<Partial<SiteConfig> | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ collection: string, id: string, label: string } | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthorized || !user) return;
    
    const unsubVids = onSnapshot(query(collection(db, 'videos'), orderBy('createdAt', 'desc')), (snap) => {
      setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Video)));
    }, (err) => handleFirestoreError(err, 'list', 'videos'));

    const unsubCats = onSnapshot(query(collection(db, 'categories'), orderBy('order', 'asc')), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    }, (err) => handleFirestoreError(err, 'list', 'categories'));

    const unsubMenu = onSnapshot(query(collection(db, 'menuItems'), orderBy('order', 'asc')), (snap) => {
      setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));
    }, (err) => handleFirestoreError(err, 'list', 'menuItems'));

    const unsubConfig = onSnapshot(doc(db, 'siteConfig', 'main'), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as SiteConfig;
        setSiteConfig(data);
        setEditingConfig(data);
      } else {
        const initialConfig = { 
          logoText: 'VidBoyz', 
          logoLink: '/', 
          logoUrl: '', 
          metaDescription: '', 
          headScripts: '',
          adsEnabled: false,
          adType: 'image',
          adDuration: 15,
          adSkipDelay: 5,
          likesEnabled: true,
          viewsEnabled: true,
          viewsOnHomeEnabled: true,
          viewsOnDetailEnabled: true,
          favoritesEnabled: true
        };
        setEditingConfig(initialConfig);
      }
    }, (err) => handleFirestoreError(err, 'get', 'siteConfig'));

    return () => { unsubVids(); unsubCats(); unsubMenu(); unsubConfig(); };
  }, [isAuthorized, user]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'hworldplayz' && password === 'hworldplayz@512') {
      setIsAuthorized(true);
      setError('');
    } else {
      setError('Invalid credentials');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user.email !== 'hworldplayz@gmail.com') {
        console.warn('Unauthorized email:', result.user.email);
        setError(`Unauthorized: ${result.user.email} is not the admin account.`);
        await signOut(auth);
      } else if (!result.user.emailVerified) {
        setError('Your Google email is not verified. Please verify it and try again.');
        await signOut(auth);
      } else {
        setError('');
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.message || 'Failed to authenticate with Google');
    }
  };

  const handleSeedData = async () => {
    if (!window.confirm('This will add sample videos and categories to your database. Continue?')) return;
    
    const sampleCategories = [
      { name: 'Music', slug: 'music', order: 0 },
      { name: 'Gaming', slug: 'gaming', order: 1 },
      { name: 'Tech', slug: 'tech', order: 2 },
      { name: 'Movies', slug: 'movies', order: 3 }
    ];

    const sampleVideos = [
      {
        title: 'Cyberpunk Cityscape',
        description: 'A beautiful 4K video of a futuristic city.',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-at-night-with-neon-lights-40130-preview.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&q=80&w=800',
        categories: ['Tech'],
        category: 'Tech',
        isIframe: false,
        tags: ['cyberpunk', 'neon', 'future'],
        createdAt: Date.now()
      },
      {
        title: 'Lo-Fi Hip Hop Radio',
        description: 'Beats to relax/study to.',
        videoUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk',
        posterUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=800',
        categories: ['Music'],
        category: 'Music',
        isIframe: true,
        tags: ['lofi', 'chill', 'beats'],
        createdAt: Date.now() - 10000
      }
    ];

    try {
      for (const cat of sampleCategories) {
        await addDoc(collection(db, 'categories'), cat);
      }
      for (const vid of sampleVideos) {
        await addDoc(collection(db, 'videos'), vid);
      }
      alert('Sample data seeded successfully!');
    } catch (err) {
      handleFirestoreError(err, 'write' as any, 'multiple');
    }
  };

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const errInfo = {
      error: error.message || String(error),
      operationType: operation,
      path: path,
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified
      }
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
    setToast({ message: `Permission Denied: ${error.message || 'Check console for details'}`, type: 'error' });
  };

  const extractIframeSrc = (input: string) => {
    if (input.includes('<iframe')) {
      const match = input.match(/src="([^"]+)"/);
      return match ? match[1] : input;
    }
    return input;
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;
    const { id, ...rest } = editingVideo;
    
    const categoriesList = Array.isArray(editingVideo.categories) 
      ? editingVideo.categories 
      : (editingVideo.category ? [editingVideo.category] : ['Other']);

    const videoData = {
      ...rest,
      videoUrl: extractIframeSrc(editingVideo.videoUrl || ''),
      createdAt: editingVideo.createdAt || Date.now(),
      tags: typeof editingVideo.tags === 'string' 
        ? Array.from(new Set((editingVideo.tags as string).split(',').map(t => t.trim()).filter(Boolean))) 
        : Array.from(new Set((editingVideo.tags || []).map(t => t.trim()).filter(Boolean))),
      categories: categoriesList,
      category: categoriesList[0] || 'Other'
    };
    try {
      if (id) {
        await updateDoc(doc(db, 'videos', id), videoData);
        setToast({ message: 'Video updated!', type: 'success' });
      } else {
        await addDoc(collection(db, 'videos'), videoData);
        setToast({ message: 'Video added!', type: 'success' });
      }
      setEditingVideo(null);
    } catch (err) { handleFirestoreError(err, 'write', 'videos'); }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const { id, ...data } = editingCategory;
    try {
      if (id) {
        await updateDoc(doc(db, 'categories', id), data);
        setToast({ message: 'Category updated!', type: 'success' });
      } else {
        await addDoc(collection(db, 'categories'), data);
        setToast({ message: 'Category added!', type: 'success' });
      }
      setEditingCategory(null);
    } catch (err) { handleFirestoreError(err, 'write', 'categories'); }
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMenuItem) return;
    const { id, ...data } = editingMenuItem;
    try {
      if (id) {
        await updateDoc(doc(db, 'menuItems', id), data);
        setToast({ message: 'Menu item updated!', type: 'success' });
      } else {
        await addDoc(collection(db, 'menuItems'), data);
        setToast({ message: 'Menu item added!', type: 'success' });
      }
      setEditingMenuItem(null);
    } catch (err) { handleFirestoreError(err, 'write', 'menuItems'); }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;
    try {
      const { id, ...data } = editingConfig;
      await setDoc(doc(db, 'siteConfig', 'main'), data);
      setToast({ message: 'Configuration saved!', type: 'success' });
    } catch (err) { handleFirestoreError(err, 'write', 'siteConfig'); }
  };

  const handleDelete = (collectionName: string, id: string, label: string) => {
    setDeletingItem({ collection: collectionName, id, label });
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    try { 
      await deleteDoc(doc(db, deletingItem.collection, deletingItem.id)); 
      setToast({ message: 'Deleted successfully!', type: 'success' });
    } catch (err) { 
      handleFirestoreError(err, 'delete', deletingItem.collection); 
    } finally {
      setDeletingItem(null);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsAuthorized(false);
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-10 rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md"
        >
          <div className="text-center mb-10">
            <div className="inline-block bg-brand p-3 rounded-2xl mb-4 shadow-lg shadow-brand/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-black tracking-tighter text-gray-900 uppercase italic">
              Admin <span className="text-brand">Portal</span>
            </h2>
            <p className="text-gray-500 mt-2 font-medium">Enter your credentials to manage content.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand/20 transition-all outline-none font-medium"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-brand/20 transition-all outline-none font-medium"
                placeholder="Enter password"
              />
            </div>
            {error && <p className="text-brand text-sm font-bold text-center">{error}</p>}
            <button
              type="submit"
              className="w-full bg-brand hover:bg-brand-hover text-white font-black py-4 rounded-2xl shadow-lg shadow-brand/20 transition-all transform active:scale-[0.98] uppercase tracking-widest italic"
            >
              Authorize Access
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md text-center"
        >
          <div className="inline-block bg-brand/10 p-4 rounded-full mb-6">
            <Lock className="w-10 h-10 text-brand" />
          </div>
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">Final <span className="text-brand">Step</span></h2>
          <p className="text-gray-500 mb-8 font-medium">To gain write permissions, please sign in with your admin Google account (hworldplayz@gmail.com).</p>
          <button
            onClick={handleGoogleSignIn}
            className="w-full bg-white border-2 border-gray-100 hover:border-brand text-gray-700 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-sm"
          >
            <img src="https://www.gstatic.com/firebase/anonymous-scan.png" className="w-6 h-6 grayscale" />
            Sign in with Google
          </button>
          <button onClick={() => setIsAuthorized(false)} className="mt-6 text-sm text-gray-400 font-bold uppercase tracking-widest hover:text-brand transition-colors">
            Back to Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 uppercase italic leading-none">
            Admin <span className="text-brand">Panel</span>
          </h1>
          <p className="mt-4 text-gray-500 font-medium text-lg">Logged in as: <span className="text-brand font-bold">{user.email}</span></p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleSeedData}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold px-4 py-2 rounded-xl transition-all text-sm uppercase tracking-wider"
            title="Restore sample videos and categories"
          >
            <Plus className="w-4 h-4" /> Seed Data
          </button>
          <button onClick={handleLogout} className="p-3 text-gray-400 hover:text-brand transition-colors">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-4 mb-8 border-b border-gray-100 pb-4">
        {(['videos', 'categories', 'menu', 'config'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest transition-all",
              activeTab === tab ? "bg-brand text-white shadow-lg shadow-brand/20" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Videos Section */}
      {activeTab === 'videos' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Manage <span className="text-brand">Videos</span></h2>
            <button 
              onClick={() => setEditingVideo({ videoUrl: '', isIframe: true, categories: [categories[0]?.name || 'Other'], category: categories[0]?.name || 'Other' })}
              className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-brand/20 transition-all uppercase tracking-wider text-sm italic"
            >
              <Plus className="w-5 h-5" /> Add Video
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Video</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Stats</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {videos.map(video => (
                  <tr key={video.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {video.posterUrl ? <img src={video.posterUrl} className="w-20 aspect-video rounded-lg object-cover" /> : <div className="w-20 aspect-video bg-gray-100 rounded-lg flex items-center justify-center"><Play className="w-6 h-6 text-gray-300" /></div>}
                        <div>
                          <div className="font-bold text-gray-900">{video.title || 'Untitled'}</div>
                          <div className="text-xs text-gray-400 font-medium mt-1">ID: {video.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {video.categories && Array.isArray(video.categories) && video.categories.length > 0 ? (
                          video.categories.map((cat, idx) => (
                            <span key={`${cat}-${idx}`} className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                              {cat}
                            </span>
                          ))
                        ) : (
                          <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                            {video.category || 'Other'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {video.views || 0}
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" /> {video.likes || 0}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingVideo(video)} className="p-2 text-gray-400 hover:text-brand transition-colors"><Edit2 className="w-5 h-5" /></button>
                        <button onClick={() => handleDelete('videos', video.id, video.title || 'Untitled Video')} className="p-2 text-gray-400 hover:text-brand transition-colors"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categories Section */}
      {activeTab === 'categories' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Manage <span className="text-brand">Categories</span></h2>
            <button 
              onClick={() => setEditingCategory({ name: '', slug: '', order: categories.length })}
              className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-brand/20 transition-all uppercase tracking-wider text-sm italic"
            >
              <Plus className="w-5 h-5" /> Add Category
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Slug</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Order</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map(cat => (
                  <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{cat.name}</td>
                    <td className="px-6 py-4 text-gray-500">{cat.slug}</td>
                    <td className="px-6 py-4 text-gray-500">{cat.order}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingCategory(cat)} className="p-2 text-gray-400 hover:text-brand transition-colors"><Edit2 className="w-5 h-5" /></button>
                        <button onClick={() => handleDelete('categories', cat.id, cat.name)} className="p-2 text-gray-400 hover:text-brand transition-colors"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Menu Items Section */}
      {activeTab === 'menu' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Manage <span className="text-brand">Menu</span></h2>
            <button 
              onClick={() => setEditingMenuItem({ label: '', link: '', order: menuItems.length })}
              className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-brand/20 transition-all uppercase tracking-wider text-sm italic"
            >
              <Plus className="w-5 h-5" /> Add Menu Item
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Label</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Link</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Parent</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {menuItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{item.label}</td>
                    <td className="px-6 py-4 text-gray-500">{item.link}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {menuItems.find(m => m.id === item.parentId)?.label || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingMenuItem(item)} className="p-2 text-gray-400 hover:text-brand transition-colors"><Edit2 className="w-5 h-5" /></button>
                        <button onClick={() => handleDelete('menuItems', item.id, item.label)} className="p-2 text-gray-400 hover:text-brand transition-colors"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Config Section */}
      {activeTab === 'config' && (
        <div className="space-y-8">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Site <span className="text-brand">Configuration</span></h2>
          <form onSubmit={handleSaveConfig} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Logo Text</label>
                <input
                  type="text"
                  value={editingConfig?.logoText || ''}
                  onChange={(e) => setEditingConfig({ ...editingConfig, logoText: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Logo Link</label>
                <input
                  type="text"
                  value={editingConfig?.logoLink || ''}
                  onChange={(e) => setEditingConfig({ ...editingConfig, logoLink: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Hero Title</label>
                <input
                  type="text"
                  value={editingConfig?.heroTitle || ''}
                  onChange={(e) => setEditingConfig({ ...editingConfig, heroTitle: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium"
                  placeholder="Latest"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Hero Subtitle</label>
                <input
                  type="text"
                  value={editingConfig?.heroSubtitle || ''}
                  onChange={(e) => setEditingConfig({ ...editingConfig, heroSubtitle: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium"
                  placeholder="The freshest content on the web."
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Logo Image URL</label>
              <input
                type="text"
                value={editingConfig?.logoUrl || ''}
                onChange={(e) => setEditingConfig({ ...editingConfig, logoUrl: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Meta Description</label>
              <textarea
                value={editingConfig?.metaDescription || ''}
                onChange={(e) => setEditingConfig({ ...editingConfig, metaDescription: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Head Scripts (HTML)</label>
              <textarea
                value={editingConfig?.headScripts || ''}
                onChange={(e) => setEditingConfig({ ...editingConfig, headScripts: e.target.value })}
                rows={5}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-mono text-xs resize-none"
                placeholder="<script>...</script>"
              />
            </div>

            {/* Ads Configuration */}
            <div className="pt-6 border-t border-gray-100 space-y-6">
              <h3 className="text-lg font-black uppercase italic tracking-tight">Ads <span className="text-brand">Settings</span></h3>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="adsEnabled"
                  checked={editingConfig?.adsEnabled || false}
                  onChange={(e) => setEditingConfig({ ...editingConfig, adsEnabled: e.target.checked })}
                  className="w-5 h-5 accent-brand"
                />
                <label htmlFor="adsEnabled" className="text-sm font-bold text-gray-600 uppercase tracking-wider">Enable Ads</label>
              </div>
              
              {editingConfig?.adsEnabled && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Ad Type</label>
                    <select
                      value={editingConfig?.adType || 'image'}
                      onChange={(e) => setEditingConfig({ ...editingConfig, adType: e.target.value as 'image' | 'video' })}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium"
                    >
                      <option value="image">Image Ad</option>
                      <option value="video">Video Ad</option>
                    </select>
                  </div>
                  
                  {editingConfig?.adType === 'image' ? (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Ad Image URL</label>
                      <input
                        type="text"
                        value={editingConfig?.adImageUrl || ''}
                        onChange={(e) => setEditingConfig({ ...editingConfig, adImageUrl: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Ad Video URL</label>
                      <input
                        type="text"
                        value={editingConfig?.adVideoUrl || ''}
                        onChange={(e) => setEditingConfig({ ...editingConfig, adVideoUrl: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Ad Link (URL)</label>
                    <input
                      type="text"
                      value={editingConfig?.adLink || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, adLink: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Ad Duration (seconds)</label>
                      <input
                        type="number"
                        value={editingConfig?.adDuration || 15}
                        onChange={(e) => setEditingConfig({ ...editingConfig, adDuration: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Skip Delay (seconds)</label>
                      <input
                        type="number"
                        value={editingConfig?.adSkipDelay || 5}
                        onChange={(e) => setEditingConfig({ ...editingConfig, adSkipDelay: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Views & Likes Configuration */}
            <div className="pt-6 border-t border-gray-100 space-y-6">
              <h3 className="text-lg font-black uppercase italic tracking-tight">Views & <span className="text-brand">Likes</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <ThumbsUp className="w-5 h-5 text-brand" />
                    <span className="font-bold text-gray-700">Enable Likes</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingConfig({ ...editingConfig, likesEnabled: !editingConfig?.likesEnabled })}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      editingConfig?.likesEnabled ? "bg-brand" : "bg-gray-300"
                    )}
                  >
                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", editingConfig?.likesEnabled ? "left-7" : "left-1")} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-brand" />
                    <span className="font-bold text-gray-700">Enable Views</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingConfig({ ...editingConfig, viewsEnabled: !editingConfig?.viewsEnabled })}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      editingConfig?.viewsEnabled ? "bg-brand" : "bg-gray-300"
                    )}
                  >
                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", editingConfig?.viewsEnabled ? "left-7" : "left-1")} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Heart className="w-5 h-5 text-brand" />
                    <span className="font-bold text-gray-700">Enable Favorites</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingConfig({ ...editingConfig, favoritesEnabled: !editingConfig?.favoritesEnabled })}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      editingConfig?.favoritesEnabled ? "bg-brand" : "bg-gray-300"
                    )}
                  >
                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", editingConfig?.favoritesEnabled ? "left-7" : "left-1")} />
                  </button>
                </div>
              </div>
              {editingConfig?.viewsEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <span className="font-bold text-gray-700">Show Views on Home</span>
                    <button
                      type="button"
                      onClick={() => setEditingConfig({ ...editingConfig, viewsOnHomeEnabled: !editingConfig?.viewsOnHomeEnabled })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        editingConfig?.viewsOnHomeEnabled ? "bg-brand" : "bg-gray-300"
                      )}
                    >
                      <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", editingConfig?.viewsOnHomeEnabled ? "left-7" : "left-1")} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <span className="font-bold text-gray-700">Show Views on Detail</span>
                    <button
                      type="button"
                      onClick={() => setEditingConfig({ ...editingConfig, viewsOnDetailEnabled: !editingConfig?.viewsOnDetailEnabled })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        editingConfig?.viewsOnDetailEnabled ? "bg-brand" : "bg-gray-300"
                      )}
                    >
                      <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", editingConfig?.viewsOnDetailEnabled ? "left-7" : "left-1")} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="w-full bg-brand hover:bg-brand-hover text-white font-black py-4 rounded-2xl shadow-lg shadow-brand/20 transition-all uppercase tracking-widest italic">
              Save Configuration
            </button>
          </form>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {editingVideo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black uppercase italic tracking-tight">{editingVideo.id ? 'Edit' : 'Add'} <span className="text-brand">Video</span></h3>
                <button onClick={() => setEditingVideo(null)} className="p-2 text-gray-400 hover:text-brand"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSaveVideo} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Title (Optional)</label>
                      <input type="text" value={editingVideo.title || ''} onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Categories (Select Multiple)</label>
                      <div className="bg-gray-50 rounded-xl p-4 max-h-[160px] overflow-y-auto space-y-2 border border-gray-100 focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/20 outline-none">
                        {categories.map(cat => {
                          const isSelected = editingVideo.categories && Array.isArray(editingVideo.categories) 
                            ? editingVideo.categories.includes(cat.name) 
                            : editingVideo.category === cat.name;
                          return (
                            <label key={cat.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-200/50 p-1.5 rounded-lg transition-colors">
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                onChange={(e) => {
                                  const currentCats = Array.isArray(editingVideo.categories) ? [...editingVideo.categories] : (editingVideo.category ? [editingVideo.category] : []);
                                  let updatedCats;
                                  if (e.target.checked) {
                                    updatedCats = Array.from(new Set([...currentCats, cat.name]));
                                  } else {
                                    updatedCats = currentCats.filter(c => c !== cat.name);
                                  }
                                  setEditingVideo({ 
                                    ...editingVideo, 
                                    categories: updatedCats,
                                    category: updatedCats[0] || 'Other'
                                  });
                                }} 
                                className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand/20 accent-brand" 
                              />
                              <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
                            </label>
                          );
                        })}
                      </div>
                      
                      {/* Quick Add Inline Category Option */}
                      <div className="mt-3 flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Quick add category..." 
                          id="quick-add-category-input"
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const inputEl = e.currentTarget;
                              const value = inputEl.value.trim();
                              if (!value) return;
                              const exists = categories.some(c => c.name.toLowerCase() === value.toLowerCase());
                              if (!exists) {
                                try {
                                  const newCat = {
                                    name: value,
                                    slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
                                    order: categories.length ? Math.max(...categories.map(c => c.order)) + 10 : 10
                                  };
                                  await addDoc(collection(db, 'categories'), newCat);
                                  setToast({ message: `Category "${value}" added!`, type: 'success' });
                                  inputEl.value = '';
                                  const currentCats = Array.isArray(editingVideo.categories) ? [...editingVideo.categories] : (editingVideo.category ? [editingVideo.category] : []);
                                  const updatedCats = Array.from(new Set([...currentCats, value]));
                                  setEditingVideo(prev => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      categories: updatedCats,
                                      category: updatedCats[0] || 'Other'
                                    };
                                  });
                                } catch (err) {
                                  handleFirestoreError(err, 'write', 'categories');
                                }
                              } else {
                                setToast({ message: 'Category already exists', type: 'error' });
                              }
                            }
                          }}
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand/20 outline-none text-xs font-semibold" 
                        />
                        <button 
                          type="button" 
                          onClick={async () => {
                            const inputEl = document.getElementById('quick-add-category-input') as HTMLInputElement;
                            const value = inputEl?.value.trim();
                            if (!value) return;
                            const exists = categories.some(c => c.name.toLowerCase() === value.toLowerCase());
                            if (!exists) {
                              try {
                                const newCat = {
                                  name: value,
                                  slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
                                  order: categories.length ? Math.max(...categories.map(c => c.order)) + 10 : 10
                                };
                                await addDoc(collection(db, 'categories'), newCat);
                                setToast({ message: `Category "${value}" added!`, type: 'success' });
                                if (inputEl) inputEl.value = '';
                                const currentCats = Array.isArray(editingVideo.categories) ? [...editingVideo.categories] : (editingVideo.category ? [editingVideo.category] : []);
                                const updatedCats = Array.from(new Set([...currentCats, value]));
                                setEditingVideo(prev => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    categories: updatedCats,
                                    category: updatedCats[0] || 'Other'
                                  };
                                });
                              } catch (err) {
                                handleFirestoreError(err, 'write', 'categories');
                              }
                            } else {
                              setToast({ message: 'Category already exists', type: 'error' });
                            }
                          }}
                          className="bg-brand hover:bg-brand-hover text-white p-2 rounded-xl text-xs font-bold flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Poster URL (Optional)</label>
                      <input type="text" value={editingVideo.posterUrl || ''} onChange={(e) => setEditingVideo({ ...editingVideo, posterUrl: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Video URL / Iframe Src</label>
                      <input required type="text" value={editingVideo.videoUrl || ''} onChange={(e) => setEditingVideo({ ...editingVideo, videoUrl: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tags (Optional, comma separated)</label>
                      <input type="text" value={Array.isArray(editingVideo.tags) ? editingVideo.tags.join(', ') : editingVideo.tags || ''} onChange={(e) => setEditingVideo({ ...editingVideo, tags: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium" />
                    </div>
                    <div className="flex items-center gap-3 pt-4">
                      <input type="checkbox" id="isIframe" checked={editingVideo.isIframe || false} onChange={(e) => setEditingVideo({ ...editingVideo, isIframe: e.target.checked })} className="w-5 h-5 accent-brand" />
                      <label htmlFor="isIframe" className="text-sm font-bold text-gray-600 uppercase tracking-wider">Is Iframe / Embed?</label>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Description (Optional)</label>
                  <textarea value={editingVideo.description || ''} onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })} rows={4} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium resize-none" />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setEditingVideo(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition-all uppercase tracking-widest italic">Cancel</button>
                  <button type="submit" className="flex-[2] bg-brand hover:bg-brand-hover text-white font-black py-4 rounded-2xl shadow-lg shadow-brand/20 transition-all uppercase tracking-widest italic">Save Video</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {editingCategory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black uppercase italic tracking-tight">{editingCategory.id ? 'Edit' : 'Add'} <span className="text-brand">Category</span></h3>
                <button onClick={() => setEditingCategory(null)} className="p-2 text-gray-400 hover:text-brand"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSaveCategory} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Name</label>
                  <input required type="text" value={editingCategory.name || ''} onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Slug</label>
                  <input required type="text" value={editingCategory.slug || ''} onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Order</label>
                  <input required type="number" value={editingCategory.order || 0} onChange={(e) => setEditingCategory({ ...editingCategory, order: parseInt(e.target.value) })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium" />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setEditingCategory(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition-all uppercase tracking-widest italic">Cancel</button>
                  <button type="submit" className="flex-[2] bg-brand hover:bg-brand-hover text-white font-black py-4 rounded-2xl shadow-lg shadow-brand/20 transition-all uppercase tracking-widest italic">Save Category</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {editingMenuItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black uppercase italic tracking-tight">{editingMenuItem.id ? 'Edit' : 'Add'} <span className="text-brand">Menu Item</span></h3>
                <button onClick={() => setEditingMenuItem(null)} className="p-2 text-gray-400 hover:text-brand"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSaveMenuItem} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Label</label>
                  <input required type="text" value={editingMenuItem.label || ''} onChange={(e) => setEditingMenuItem({ ...editingMenuItem, label: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Link</label>
                  <input required type="text" value={editingMenuItem.link || ''} onChange={(e) => setEditingMenuItem({ ...editingMenuItem, link: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Parent Item (Optional)</label>
                  <select value={editingMenuItem.parentId || ''} onChange={(e) => setEditingMenuItem({ ...editingMenuItem, parentId: e.target.value || undefined })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium">
                    <option value="">None (Main Item)</option>
                    {menuItems.filter(m => !m.parentId && m.id !== editingMenuItem.id).map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Order</label>
                  <input required type="number" value={editingMenuItem.order || 0} onChange={(e) => setEditingMenuItem({ ...editingMenuItem, order: parseInt(e.target.value) })} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-brand/20 outline-none font-medium" />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setEditingMenuItem(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition-all uppercase tracking-widest italic">Cancel</button>
                  <button type="submit" className="flex-[2] bg-brand hover:bg-brand-hover text-white font-black py-4 rounded-2xl shadow-lg shadow-brand/20 transition-all uppercase tracking-widest italic">Save Menu Item</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {deletingItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center">
              <div className="inline-block bg-brand/10 p-4 rounded-full mb-6">
                <Trash2 className="w-10 h-10 text-brand" />
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tight mb-4">Confirm <span className="text-brand">Delete</span></h3>
              <p className="text-gray-500 mb-8 font-medium">Are you sure you want to delete <span className="text-gray-900 font-bold">"{deletingItem.label}"</span>? This action cannot be undone.</p>
              <div className="flex gap-4">
                <button onClick={() => setDeletingItem(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition-all uppercase tracking-widest italic">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 bg-brand hover:bg-brand-hover text-white font-black py-4 rounded-2xl shadow-lg shadow-brand/20 transition-all uppercase tracking-widest italic">Delete</button>
              </div>
            </div>
          </motion.div>
        )}

        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }} 
            className={`fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold uppercase tracking-wider text-sm ${toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-brand text-white'}`}
          >
            {toast.type === 'success' ? <Check className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            {toast.message}
            <button onClick={() => setToast(null)} className="ml-4 opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const FavoritesOverlay = () => {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadFavorites = () => {
      const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
      setFavorites(favs);
    };

    loadFavorites();
    window.addEventListener('favoritesChanged', loadFavorites);
    return () => window.removeEventListener('favoritesChanged', loadFavorites);
  }, []);

  if (favorites.length === 0) return null;

  return (
    <div className="fixed bottom-8 left-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-16 left-0 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-black uppercase italic tracking-tight">My <span className="text-brand">Favorites</span></h3>
              <button onClick={() => setIsOpen(false)} className="p-2 text-gray-400 hover:text-brand transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
              {favorites.map((video) => (
                <Link
                  key={video.id}
                  to={`/video/${video.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-all group"
                >
                  <div className="w-20 aspect-video rounded-lg overflow-hidden bg-black flex-shrink-0">
                    {video.posterUrl ? (
                      <img src={video.posterUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-4 h-4 text-white/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 truncate group-hover:text-brand transition-colors">
                      {video.title || 'Untitled Video'}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                      Click to watch
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all relative group",
          isOpen ? "bg-brand text-white" : "bg-white text-brand border border-gray-100"
        )}
      >
        <Heart className={cn("w-6 h-6", favorites.length > 0 && "fill-current")} />
        <span className="absolute -top-1 -right-1 bg-brand text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
          {favorites.length}
        </span>
      </motion.button>
    </div>
  );
};

export default function App() {
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'siteConfig', 'main'), (doc) => {
      if (doc.exists()) {
        setSiteConfig(doc.data() as SiteConfig);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (siteConfig) {
      // Update meta description
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', siteConfig.metaDescription || '');

      // Inject head scripts
      // Note: This is a simple implementation. For complex scripts, a more robust solution might be needed.
      const scriptContainerId = 'site-config-scripts';
      let scriptContainer = document.getElementById(scriptContainerId);
      if (scriptContainer) {
        scriptContainer.innerHTML = '';
      } else {
        scriptContainer = document.createElement('div');
        scriptContainer.id = scriptContainerId;
        document.head.appendChild(scriptContainer);
      }
      
      if (siteConfig.headScripts) {
        const range = document.createRange();
        const fragment = range.createContextualFragment(siteConfig.headScripts);
        scriptContainer.appendChild(fragment);
      }
    }
  }, [siteConfig]);

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/video/:id" element={<VideoPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/category/:category" element={<HomePage />} />
          </Routes>
        </main>
        <footer className="bg-white border-t border-gray-100 py-12">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <span className="text-xl font-black tracking-tighter text-gray-900 uppercase italic">
              {siteConfig?.logoText || 'Vid'}<span className="text-brand">{siteConfig?.logoText ? '' : 'Boyz'}</span>
            </span>
            <p className="mt-4 text-gray-400 text-sm font-medium">
              &copy; 2026 {siteConfig?.logoText || 'VidBoyz'} Media. All rights reserved.
            </p>
          </div>
        </footer>
        <FavoritesOverlay />
      </div>
    </Router>
  );
}
