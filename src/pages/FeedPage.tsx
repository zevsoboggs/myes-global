import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { Heart, MessageSquare, User, Shield, Image as ImageIcon, UserPlus, UserMinus, Trash2, Home } from 'lucide-react';

type ProfileLite = {
  id: string;
  full_name: string | null;
  avatar_url?: string | null;
  is_verified?: boolean | null;
};

type PostMedia = {
  storage_path: string;
  mime: string | null;
  width: number | null;
  height: number | null;
};

type ReactionCount = { count: number };
type CommentCount = { count: number };

type CommentItem = {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
  parent_id: string | null;
  profiles?: ProfileLite;
};

type PostItem = {
  id: string;
  author_id: string;
  text: string | null;
  created_at: string;
  profiles?: ProfileLite; // joined via author_id
  post_media?: PostMedia[];
  reactions?: ReactionCount[];
  comments?: CommentCount[];
  post_properties?: { property_id: string; properties?: { id: string; title: string; price_usdt: number; property_images?: { image_url: string }[] } }[];
};

export function FeedPage() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [newPost, setNewPost] = useState<string>('');
  const [likeBusy, setLikeBusy] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentsOpen, setCommentsOpen] = useState<Record<string, boolean>>({});
  const [postComments, setPostComments] = useState<Record<string, CommentItem[]>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [replyTarget, setReplyTarget] = useState<Record<string, { id: string; author: string } | null>>({});
  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(new Set());

  const canPost = Boolean(user);

  type SimpleProperty = { id: string; title: string; price_usdt: number | null; image_url?: string | null };
  const [attachedProperties, setAttachedProperties] = useState<SimpleProperty[]>([]);
  const [showPropertyPicker, setShowPropertyPicker] = useState<boolean>(false);
  const [propertyQuery, setPropertyQuery] = useState<string>('');
  const [propertyResults, setPropertyResults] = useState<SimpleProperty[]>([]);
  const [propertyLoading, setPropertyLoading] = useState<boolean>(false);

  const fetchFeed = async () => {
    setIsLoading(true);
    const query = supabase
      .from('posts')
      .select(
        `id, text, created_at, author_id,
         profiles:author_id (id, full_name, avatar_url, is_verified),
         post_media (storage_path, mime, width, height),
         reactions(count),
         comments(count),
         post_properties ( property_id, properties:property_id ( id, title, price_usdt, property_images ( image_url ) ) )`
      )
      .order('created_at', { ascending: false })
      .limit(50);

    const { data, error } = await query;
    if (!error && data) {
      setPosts(data as unknown as PostItem[]);
    }
    setIsLoading(false);
  };

  const fetchComments = async (postId: string) => {
    const { data, error } = await supabase
      .from('comments')
      .select(
        `id, text, created_at, user_id, parent_id,
         profiles:user_id (id, full_name, avatar_url, is_verified)`
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(50);
    if (!error && data) {
      setPostComments((prev) => ({ ...prev, [postId]: data as unknown as CommentItem[] }));
    }
  };

  useEffect(() => {
    fetchFeed();
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', user.id);
      if (data) setFollowingIds(new Set((data as any[]).map((r) => r.followee_id as string)));
    })();
    const channel = supabase
      .channel('realtime:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        // fetch new row with joins
        fetchFeed();
      })
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [user]);

  const handleCreatePost = async () => {
    if (!user) return;
    if (!newPost.trim() && selectedFiles.length === 0 && attachedProperties.length === 0) return;
    // 1) создаем пост (has_media = true если выбраны файлы)
    const { data: postRow, error: postErr } = await supabase
      .from('posts')
      .insert({ author_id: user.id, text: newPost.trim() || null, has_media: selectedFiles.length > 0 })
      .select('id')
      .single();
    if (postErr || !postRow) return;

    const postId = postRow.id as string;

    // 2) если выбраны файлы — загружаем в storage и создаем post_media
    if (selectedFiles.length > 0) {
      const uploads = selectedFiles.map(async (file, idx) => {
        const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const path = `${user.id}/${postId}/${Date.now()}_${idx}_${safeName}`;
        const { error: upErr, data: upData } = await supabase.storage
          .from('post-media')
          .upload(path, file, { contentType: file.type });
        if (!upErr && upData) {
          await supabase.from('post_media').insert({
            post_id: postId,
            storage_path: upData.path,
            mime: file.type,
          });
        }
      });
      await Promise.all(uploads);
    }

    // 2.5) прикрепляем объекты
    if (attachedProperties.length > 0) {
      const links = attachedProperties.map((p) => ({ post_id: postId, property_id: p.id }));
      await supabase.from('post_properties').insert(links);
    }

    // 3) очистка и обновление
    setNewPost('');
    setSelectedFiles([]);
    setAttachedProperties([]);
    await fetchFeed();
  };

  const isLiked = (_post: PostItem): boolean => false;

  const toggleLike = async (post: PostItem) => {
    if (!user) return;
    setLikeBusy(post.id);
    // try insert; if conflict, delete
    const { error: insErr } = await supabase.from('reactions').insert({ post_id: post.id, user_id: user.id, type: 'like' });
    if (insErr) {
      await supabase.from('reactions').delete().match({ post_id: post.id, user_id: user.id, type: 'like' });
    }
    await fetchFeed();
    setLikeBusy(null);
  };

  const submitComment = async (post: PostItem) => {
    if (!user) return;
    const text = (commentDrafts[post.id] || '').trim();
    if (!text) return;
    const parent = replyTarget[post.id]?.id || null;
    const { error } = await supabase.from('comments').insert({ post_id: post.id, user_id: user.id, text, parent_id: parent });
    if (!error) {
      setCommentDrafts((prev) => ({ ...prev, [post.id]: '' }));
      setReplyTarget((prev) => ({ ...prev, [post.id]: null }));
      await fetchComments(post.id);
      await fetchFeed();
    }
  };

  const mediaPublicUrl = (m: PostMedia) => {
    const { data } = supabase.storage.from('post-media').getPublicUrl(m.storage_path);
    return data.publicUrl;
  };

  const onClickPickMedia = () => fileInputRef.current?.click();

  const onFilesSelected: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    // Ограничим до 4 изображений
    const next = [...selectedFiles, ...files].slice(0, 4);
    setSelectedFiles(next);
    // сброс input
    e.target.value = '';
  };

  const removeSelectedAt = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const isFollowing = (authorId: string) => followingIds.has(authorId);

  const toggleFollow = async (authorId: string) => {
    if (!user || authorId === user.id) return;
    if (isFollowing(authorId)) {
      await supabase.from('follows').delete().match({ follower_id: user.id, followee_id: authorId });
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(authorId);
        return next;
      });
    } else {
      const { error } = await supabase.from('follows').insert({ follower_id: user.id, followee_id: authorId });
      if (!error) {
        setFollowingIds((prev) => new Set(prev).add(authorId));
      }
    }
  };

  const deletePost = async (postId: string) => {
    await supabase.from('posts').delete().eq('id', postId);
    await fetchFeed();
  };

  const saveProperty = async (propertyId?: string) => {
    if (!user || !propertyId) return;
    await supabase.from('favorites').insert({ user_id: user.id, property_id: propertyId });
    setSavedPropertyIds((prev) => new Set(prev).add(propertyId));
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleString();

  const empty = useMemo(() => !isLoading && posts.length === 0, [isLoading, posts.length]);

  const openPropertyPicker = async () => {
    if (!user) return;
    setShowPropertyPicker(true);
    await searchProperties('');
  };

  const searchProperties = async (q: string) => {
    if (!user) return;
    setPropertyLoading(true);
    let query = supabase
      .from('properties')
      .select(`id, title, price_usdt, property_images ( image_url, is_primary )`)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);
    if (profile?.role === 'realtor') {
      query = query.eq('realtor_id', user.id);
    }
    if (q.trim()) {
      query = query.or(`title.ilike.%${q}%,address.ilike.%${q}%`);
    }
    const { data } = await query;
    const results: SimpleProperty[] = (data || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      price_usdt: p.price_usdt ?? null,
      image_url: p.property_images?.[0]?.image_url || null,
    }));
    setPropertyResults(results);
    setPropertyLoading(false);
  };

  const attachProperty = (prop: SimpleProperty) => {
    if (attachedProperties.find((p) => p.id === prop.id)) return;
    setAttachedProperties((prev) => [...prev, prop]);
    setShowPropertyPicker(false);
    setPropertyQuery('');
  };

  const removeAttachedProperty = (id: string) => {
    setAttachedProperties((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            {t('feed.title')}
          </h1>
          <p className="text-gray-600">{t('feed.subtitle')}</p>
        </div>

        {/* Post Composer */}
        {canPost && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8 relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500" />
            
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-md">
                <User className="w-6 h-6 text-white" />
              </div>
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder={t('feed.composer.placeholder')}
                className="flex-1 resize-none outline-none text-base text-gray-900 placeholder:text-gray-400 min-h-[80px] pt-2"
              />
            </div>
            
            {selectedFiles.length > 0 && (
              <div className="ml-15 mb-4 grid grid-cols-2 gap-3">
                {selectedFiles.map((f, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={URL.createObjectURL(f)}
                      alt="preview"
                      className="rounded-xl w-full h-40 object-cover shadow-md transition-transform group-hover:scale-[1.02]"
                    />
                    <button
                      type="button"
                      onClick={() => removeSelectedAt(idx)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {attachedProperties.length > 0 && (
              <div className="ml-15 mb-4 space-y-3">
                {attachedProperties.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-3 border border-blue-100">
                    <div className="w-20 h-16 bg-white rounded-lg overflow-hidden shadow-sm">
                      {p.image_url && <img src={p.image_url} alt="prop" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{p.title}</div>
                      <div className="text-xs text-blue-600 font-medium">{p.price_usdt ? `USDT ${p.price_usdt.toLocaleString?.()}` : ''}</div>
                    </div>
                    <button 
                      onClick={() => removeAttachedProperty(p.id)} 
                      className="w-8 h-8 rounded-full bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <button 
                  onClick={onClickPickMedia} 
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">{t('feed.composer.media')}</span>
                </button>
                <button 
                  onClick={openPropertyPicker} 
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <Home className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">{t('feed.attachProperty')}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onFilesSelected}
                />
              </div>
              <button
                onClick={handleCreatePost}
                disabled={!newPost.trim() && selectedFiles.length === 0 && attachedProperties.length === 0}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                {t('feed.composer.post')}
              </button>
            </div>
            
            {showPropertyPicker && (
              <div className="relative mt-2">
                <div className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-full p-2">
                  <input
                    value={propertyQuery}
                    onChange={async (e) => { setPropertyQuery(e.target.value); await searchProperties(e.target.value); }}
                    placeholder={t('common.search')}
                    className="w-full text-xs px-2.5 py-2 border border-gray-200 rounded-md outline-none mb-2"
                  />
                  <div className="max-h-56 overflow-auto space-y-1">
                    {propertyLoading && <div className="text-xs text-gray-500 px-1 py-1">{t('common.loading')}</div>}
                    {!propertyLoading && propertyResults.length === 0 && (
                      <div className="text-xs text-gray-500 px-1 py-1">{t('feed.empty')}</div>
                    )}
                    {propertyResults.map((p) => (
                      <button key={p.id} onClick={() => attachProperty(p)} className="w-full text-left flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50">
                        <div className="w-12 h-10 bg-gray-100 rounded-md overflow-hidden">
                          {p.image_url && <img src={p.image_url} alt="prop" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium text-gray-900 truncate">{p.title}</div>
                          <div className="text-[11px] text-gray-600">{p.price_usdt ? `USDT ${p.price_usdt.toLocaleString?.()}` : ''}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end pt-1">
                    <button onClick={() => setShowPropertyPicker(false)} className="text-[11px] px-2 py-1 rounded-md border border-gray-200 text-gray-700">{t('common.cancel')}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-gray-500 font-medium">{t('common.loading')}</p>
          </div>
        )}

        {empty && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">{t('feed.empty')}</p>
          </div>
        )}

        {/* Posts List */}
        <div className="space-y-6">
          {posts.map((post) => {
            const likeCount = post.reactions?.[0]?.count || 0;
            const commentCount = post.comments?.[0]?.count || 0;
            return (
              <div key={post.id} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-md overflow-hidden">
                      {post.profiles?.avatar_url ? (
                        <img src={post.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base font-semibold text-gray-900 truncate">{post.profiles?.full_name || t('feed.user')}</span>
                        {post.profiles?.is_verified && (
                          <div className="bg-blue-100 p-1 rounded-full">
                            <Shield className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                        )}
                        <span className="text-sm text-gray-400">· {formatDate(post.created_at)}</span>
                        {user && post.author_id !== user.id && (
                          <button
                            onClick={() => toggleFollow(post.author_id)}
                            className="ml-auto px-3 py-1 rounded-full text-sm font-medium transition-all hover:scale-105"
                            style={{
                              background: isFollowing(post.author_id) 
                                ? 'linear-gradient(to right, #f3f4f6, #e5e7eb)'
                                : 'linear-gradient(to right, #3b82f6, #06b6d4)',
                              color: isFollowing(post.author_id) ? '#374151' : 'white'
                            }}
                          >
                            {isFollowing(post.author_id) ? (
                              <span className="inline-flex items-center gap-1"><UserMinus className="w-4 h-4" /> {t('feed.unfollow')}</span>
                            ) : (
                              <span className="inline-flex items-center gap-1"><UserPlus className="w-4 h-4" /> {t('feed.follow')}</span>
                            )}
                          </button>
                        )}
                        {user && post.author_id === user.id && (
                          <button
                            onClick={() => deletePost(post.id)}
                            className="ml-auto w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
                            title={t('feed.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      {post.text && (
                        <p className="text-base text-gray-800 whitespace-pre-wrap mt-3 leading-relaxed">{post.text}</p>
                      )}
                      
                      {post.post_properties && post.post_properties.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {post.post_properties.map((pp, idx) => (
                            <div key={idx} className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100 overflow-hidden hover:shadow-md transition-shadow">
                              <a href={`/properties/${pp.properties?.id}`} className="flex">
                                <div className="w-32 h-24 bg-white">
                                  {pp.properties?.property_images && pp.properties.property_images[0]?.image_url && (
                                    <img src={pp.properties.property_images[0].image_url} alt="prop" className="w-full h-full object-cover" />
                                  )}
                                </div>
                                <div className="flex-1 p-4">
                                  <div className="text-base font-semibold text-gray-900 line-clamp-2">{pp.properties?.title}</div>
                                  <div className="text-sm text-blue-600 font-medium mt-1">USDT {pp.properties?.price_usdt?.toLocaleString?.()}</div>
                                </div>
                              </a>
                              <div className="flex items-center gap-2 px-4 pb-3">
                                <a href={`/chats?property=${pp.properties?.id}`} className="px-3 py-1.5 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">{t('feed.cta.chat')}</a>
                                <a href={`/showings?property=${pp.properties?.id}`} className="px-3 py-1.5 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors">{t('feed.cta.show')}</a>
                                <button onClick={() => saveProperty(pp.properties?.id)} className="px-3 py-1.5 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors" disabled={savedPropertyIds.has(pp.properties?.id || '')}>{t('feed.cta.save')}</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {post.post_media && post.post_media.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          {post.post_media.slice(0, 4).map((m, idx) => (
                            <div key={idx} className="relative group overflow-hidden rounded-xl">
                              <img 
                                src={mediaPublicUrl(m)} 
                                alt="media" 
                                className="w-full h-48 object-cover transition-transform group-hover:scale-110" 
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Actions Bar */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => toggleLike(post)}
                      disabled={!user || likeBusy === post.id}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105 ${
                        likeBusy === post.id 
                          ? 'opacity-60' 
                          : isLiked(post)
                            ? 'bg-red-500 text-white'
                            : 'bg-white hover:bg-red-50 text-gray-700 hover:text-red-500'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${isLiked(post) ? 'fill-current' : ''}`} />
                      <span className="font-medium">{likeCount}</span>
                    </button>
                    <button
                      onClick={() => {
                        const opened = !commentsOpen[post.id];
                        setCommentsOpen((prev) => ({ ...prev, [post.id]: opened }));
                        if (opened) fetchComments(post.id);
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-all hover:scale-105"
                    >
                      <MessageSquare className="w-5 h-5" />
                      <span className="font-medium">{commentCount}</span>
                    </button>
                  </div>
                </div>

                {/* Comments Section */}
                {commentsOpen[post.id] && (
                  <div className="px-6 pb-6">
                    <div className="border-t border-gray-100 pt-4">
                      <div className="space-y-3">
                        {(() => {
                          const cmts = postComments[post.id] || [];
                          const roots = cmts.filter((c) => !c.parent_id);
                          const childrenByParent: Record<string, CommentItem[]> = {};
                          cmts.forEach((c) => {
                            if (c.parent_id) {
                              if (!childrenByParent[c.parent_id]) childrenByParent[c.parent_id] = [];
                              childrenByParent[c.parent_id].push(c);
                            }
                          });
                          return roots.map((c) => (
                            <div key={c.id} className="space-y-2">
                              <div className="flex items-start gap-2">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-sm overflow-hidden">
                                  {c.profiles?.avatar_url ? (
                                    <img src={c.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="w-5 h-5 text-white" />
                                  )}
                                </div>
                                <div className="flex-1 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold text-gray-900">{c.profiles?.full_name || t('feed.user')}</span>
                                    <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                                  </div>
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.text}</p>
                                  {user && (
                                    <button
                                      onClick={() => setReplyTarget((prev) => ({ ...prev, [post.id]: { id: c.id, author: c.profiles?.full_name || t('feed.user') } }))}
                                      className="mt-2 text-xs text-blue-600 font-medium hover:text-blue-700"
                                    >
                                      {t('feed.reply')}
                                    </button>
                                  )}
                                </div>
                              </div>
                              {(childrenByParent[c.id] || []).map((cc) => (
                                <div key={cc.id} className="pl-12 flex items-start gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-cyan-400 flex items-center justify-center shadow-sm overflow-hidden">
                                    {cc.profiles?.avatar_url ? (
                                      <img src={cc.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                      <User className="w-4 h-4 text-white" />
                                    )}
                                  </div>
                                  <div className="flex-1 bg-blue-50 rounded-2xl px-3 py-2 border border-blue-100">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-semibold text-gray-900">{cc.profiles?.full_name || t('feed.user')}</span>
                                      <span className="text-xs text-gray-400">{formatDate(cc.created_at)}</span>
                                    </div>
                                    <p className="text-xs text-gray-700 whitespace-pre-wrap">{cc.text}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ));
                        })()}
                      </div>
                      
                      {user && (
                        <div className="mt-4">
                          {replyTarget[post.id] && (
                            <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 rounded-lg">
                              <span className="text-sm text-gray-600">{t('feed.replyingTo')}:</span>
                              <span className="px-3 py-1 rounded-full bg-white text-sm font-medium text-blue-600">{replyTarget[post.id]?.author}</span>
                              <button 
                                onClick={() => setReplyTarget((prev) => ({ ...prev, [post.id]: null }))} 
                                className="ml-auto text-sm text-red-500 hover:text-red-600"
                              >
                                {t('feed.reply.cancel')}
                              </button>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-sm">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <input
                              value={commentDrafts[post.id] || ''}
                              onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                              placeholder={t('feed.comment.placeholder')}
                              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-blue-400 transition-colors"
                            />
                            <button
                              onClick={() => submitComment(post)}
                              className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium shadow-md hover:shadow-lg transform hover:scale-105 transition-all"
                            >
                              {t('feed.comment.send')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default FeedPage;