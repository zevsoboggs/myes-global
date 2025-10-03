import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getSaleStatusLabel, getInvoiceStatusLabel } from '../lib/status';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { getChannel } from '../lib/ably';
import { MessageSquare, Send, ArrowLeft, Loader2, Search, Building2, User, Sparkles, Clock, Paperclip, CheckCheck, ChevronDown, Smile, UserPlus, Mic, MicOff, Play, Pause, Square } from 'lucide-react';

export function ChatsPage() {
  const { t, language } = useLanguage();
  const { user, profile, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeMeta, setActiveMeta] = useState<{ property?: any; sale?: any; invoice?: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [typingUntil, setTypingUntil] = useState<number>(0);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showInviteLawyer, setShowInviteLawyer] = useState(false);
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [inviting, setInviting] = useState(false);

  // Voice message states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // helpers
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDateLabel = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const tOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diff = (tOnly.getTime() - dOnly.getTime()) / 86400000;
    if (diff === 0) return t('date.today');
    if (diff === 1) return t('date.yesterday');
    return d.toLocaleDateString();
  };
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] || 'U').toUpperCase() + (parts[1]?.[0] || '').toUpperCase();
  };

  const getUserAvatar = (userProfile: any, name: string, className: string) => {
    if (userProfile?.avatar_url) {
      return (
        <img
          src={userProfile.avatar_url}
          alt={name}
          className={`${className} object-cover`}
        />
      );
    }
    return (
      <div className={`${className} bg-blue-100 text-blue-700 flex items-center justify-center font-bold`}>
        {getInitials(name)}
      </div>
    );
  };
  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  const lastActivityLabel = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const today = new Date();
    return isSameDay(d, today) ? formatTime(iso) : d.toLocaleDateString();
  };
  const getOtherName = (c: any) => {
    if (!user) return '';

    // Get property title if available
    const propertyTitle = c.property?.title;

    // Get other participants (excluding current user)
    const participants = [];
    if (c.buyer_id !== user.id && c.buyer?.full_name) {
      participants.push(`${c.buyer.full_name} (${t('profile.role.buyer')})`);
    }
    if (c.realtor_id !== user.id && c.realtor?.full_name) {
      participants.push(`${c.realtor.full_name} (${t('profile.role.realtor')})`);
    }

    if (propertyTitle) {
      return participants.length > 0
        ? `${propertyTitle} • ${participants.join(', ')}`
        : propertyTitle;
    }

    return participants.length > 0
      ? participants.join(', ')
      : t('chat.conversation');
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      console.log('🔍 ChatsPage: Starting to load conversations');
      console.log('👤 User:', user?.id, 'Role:', profile?.role);

      let allConversations = [];

      try {
        // For lawyers and Love&Pay, get conversations through RPC function
        if (profile?.role === 'lawyer' || profile?.role === 'lovepay') {
          console.log(`🏛️ Getting conversations for ${profile.role}:`, user.id);

          // First, let's check basic access to conversations table
          const { data: basicTest, error: basicError } = await supabase
            .from('conversations')
            .select('id, property_id, buyer_id, realtor_id')
            .limit(5);
          console.log('💾 Basic conversations access test:', basicTest, basicError);

          // Test RPC access
          const { data: testRPC, error: testError } = await supabase
            .rpc('test_lawyer_access', { user_uuid: user.id });
          console.log('🧪 RPC test:', testRPC, testError);

          // Debug for lawyers
          if (profile.role === 'lawyer') {
            const { data: debugData, error: debugError } = await supabase
              .rpc('debug_lawyer_sales', { lawyer_uuid: user.id });
            console.log('🔍 Lawyer sales requests:', debugData, debugError);
          }

          const { data: specialConvs, error: specialError } = await supabase
            .rpc('get_lawyer_lovepay_conversations', { user_uuid: user.id });

          console.log('📞 RPC function result:', specialConvs, specialError);

          if (!specialError && specialConvs) {
            allConversations = specialConvs;
            console.log('✅ Set conversations:', allConversations.length);
          } else {
            console.log('❌ No special conversations or error:', specialError);
          }
        } else {
          // For buyers and realtors, get conversations where they are direct participants
          console.log('👥 Getting conversations for buyer/realtor');
          const { data, error } = await supabase
            .from('conversations')
            .select(`
              *,
              property:properties(title),
              buyer:profiles!conversations_buyer_id_fkey(full_name, role, avatar_url),
              realtor:profiles!conversations_realtor_id_fkey(full_name, role, avatar_url)
            `)
            .or(`buyer_id.eq.${user.id},realtor_id.eq.${user.id}`)
            .order('last_message_at', { ascending: false });

          console.log('👥 Buyer/Realtor conversations:', data, error);

          if (!error && data) {
            allConversations = data;
          }
        }

        console.log('📋 Final conversations to set:', allConversations);
        setConversations(allConversations || []);
      } catch (err) {
        console.error('💥 Error in conversations loading:', err);
      } finally {
        setLoading(false);
        console.log('🏁 Finished loading conversations');
      }
    })();
  }, [user, profile]);

  useEffect(() => {
    if (!activeId || !user) return;
    let ablyUnsub: any = null;
    let sbChannel: any = null;
    let receiptsChannel: any = null;
    (async () => {
      console.log('📨 Loading messages for conversation:', activeId, 'User role:', profile?.role);

      // Сначала проверим, есть ли связь юриста с этим разговором
      if (profile?.role === 'lawyer') {
        // Найдем conversation в уже загруженном списке (из RPC функции)
        const conv = conversations.find(c => c.id === activeId);
        console.log('🏠 Conversation details from RPC:', conv);

        // Проверим ВСЕ sales_requests для этого юриста
        const { data: allLawyerRequests, error: lawyerError } = await supabase
          .from('sales_requests')
          .select('*')
          .eq('lawyer_id', user?.id);
        console.log('👨‍⚖️ ALL sales requests for lawyer:', allLawyerRequests);
        console.log('👨‍⚖️ Error getting lawyer sales_requests:', lawyerError);

        // Тест: может ли юрист вообще читать sales_requests без фильтров?
        const { data: allSalesTest, error: allSalesError } = await supabase
          .from('sales_requests')
          .select('*')
          .limit(5);
        console.log('🧪 Can lawyer read sales_requests table?', { data: allSalesTest, error: allSalesError });

        // Тест: есть ли sales_request с этим юристом вообще?
        const { data: specificTest, error: specificError } = await supabase
          .from('sales_requests')
          .select('*')
          .eq('lawyer_id', 'e0eb882d-127f-443c-9679-227294649cac');
        console.log('🧪 Sales requests with this lawyer ID:', { data: specificTest, error: specificError });

        if (conv?.property_id) {
          const { data: salesRequests } = await supabase
            .from('sales_requests')
            .select('*')
            .eq('property_id', conv.property_id)
            .eq('lawyer_id', user?.id);
          console.log('📋 Sales requests for lawyer on this property:', salesRequests);

          const { data: allSalesForProperty } = await supabase
            .from('sales_requests')
            .select('*')
            .eq('property_id', conv.property_id);
          console.log('📋 All sales requests for property:', allSalesForProperty);

          // Проверим точные совпадения для RLS политики
          console.log('🔍 Conversation participants:', {
            buyer_id: conv.buyer_id,
            realtor_id: conv.realtor_id,
            property_id: conv.property_id
          });

          if (salesRequests && salesRequests.length > 0) {
            salesRequests.forEach((sr, i) => {
              console.log(`🔍 Sales request ${i + 1} match check:`, {
                sales_buyer_id: sr.buyer_id,
                conv_buyer_id: conv.buyer_id,
                buyer_match: sr.buyer_id === conv.buyer_id,
                sales_realtor_id: sr.realtor_id,
                conv_realtor_id: conv.realtor_id,
                realtor_match: sr.realtor_id === conv.realtor_id,
                both_match: sr.buyer_id === conv.buyer_id && sr.realtor_id === conv.realtor_id
              });
            });
          }
        }
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(full_name, role, is_verified, avatar_url)')
        .eq('conversation_id', activeId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error loading messages:', error);
      } else {
        console.log('✅ Messages loaded:', data?.length || 0);
      }

      setMessages(data || []);
      // загрузить мета: property + sale + invoice
      // Используем conversation из уже загруженного списка вместо прямого запроса
      const conv = conversations.find(c => c.id === activeId);
      if (conv?.property_id) {
        const { data: prop } = await supabase.from('properties').select('id,title,is_active').eq('id', conv.property_id).maybeSingle();
        const { data: sale } = await supabase.from('sales_requests').select('*').eq('property_id', conv.property_id).order('created_at', { ascending: false }).maybeSingle();
        let invoice: any = null;
        if (sale) {
          const { data: inv } = await supabase.from('invoices').select('*').eq('sales_request_id', sale.id).maybeSingle();
          invoice = inv || null;
        }
        setActiveMeta({ property: prop, sale, invoice });
      } else {
        setActiveMeta(null);
      }
      // подписка: Ably для сообщений и typing
      try {
        const channel = getChannel(`conv:${activeId}`);
        const msgHandler = async (msg: any) => {
          if (msg?.name === 'message:new') {
            const m = msg.data;

            // Загружаем данные профиля отправителя для нового сообщения
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('full_name, role, is_verified')
              .eq('id', m.sender_id)
              .single();

            // Добавляем профиль к сообщению
            const messageWithSender = {
              ...m,
              sender: senderProfile
            };

            setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, messageWithSender]));
          }
          if (msg?.name === 'typing') {
            const d = msg.data as { userId: string; until: number };
            if (d && d.userId !== user.id) setTypingUntil(d.until);
          }
          if (msg?.name === 'receipt:new') {
            // просто триггерим перерисовку
            setMessages((prev) => [...prev]);
          }
        };
        channel.subscribe(msgHandler);
        ablyUnsub = () => channel.unsubscribe();
      } catch (e) {
        console.warn('Ably недоступен, включаю Supabase Realtime fallback', e);
        sbChannel = supabase
          .channel(`messages:${activeId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeId}` },
            (payload) => {
              const m = payload.new as any;
              setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
            }
          )
          .subscribe();
      }
      // подписка на receipts (фолбэк)
      receiptsChannel = supabase
        .channel(`receipts:${activeId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'message_receipts' },
          () => setMessages((prev) => [...prev])
        )
        .subscribe();
    })();
    return () => {
      if (ablyUnsub) ablyUnsub();
      if (sbChannel) supabase.removeChannel(sbChannel);
      if (receiptsChannel) supabase.removeChannel(receiptsChannel);
    };
  }, [activeId, user]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!activeId) return;
    inputRef.current?.focus();
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [activeId]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = el.scrollTop >= el.scrollHeight - el.clientHeight - 120;
      setShowScrollDown(!atBottom);
    };
    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [listRef]);

  // Подписанные ссылки для вложений
  useEffect(() => {
    (async () => {
      if (!activeId) return;
      const withAttachments = messages.filter((m) => m.attachment_url && !signedUrls[m.id]);
      if (withAttachments.length === 0) return;
      const updates: Record<string, string> = {};
      for (const m of withAttachments) {
        const { data } = await supabase.storage.from('chat-attachments').createSignedUrl(m.attachment_url, 60 * 60);
        if (data?.signedUrl) updates[m.id] = data.signedUrl;
      }
      if (Object.keys(updates).length) setSignedUrls((prev) => ({ ...prev, ...updates }));
    })();
  }, [messages, activeId]);

  // Автомаркировка как прочитано
  useEffect(() => {
    (async () => {
      if (!user || !activeId || messages.length === 0) return;
      const toMark = messages.filter((m) => m.sender_id !== user.id);
      if (toMark.length === 0) return;
      for (const m of toMark) {
        try {
          const { error } = await supabase
            .from('message_receipts')
            .insert({ message_id: m.id, user_id: user.id });
          if (!error) {
            try {
              const ch = getChannel(`conv:${activeId}`);
              ch.publish('receipt:new', { message_id: m.id, user_id: user.id });
            } catch {}
          }
        } catch {}
      }
    })();
  }, [messages, user, activeId]);

  const sendMessage = async () => {
    if (!text.trim() || !user || !activeId) return;
    setSending(true);
    try {
      const newMsg = { conversation_id: activeId, sender_id: user.id, content: text.trim() };
      console.log('📤 Sending message:', newMsg, 'User role:', profile?.role);
      const { data, error } = await supabase.from('messages').insert(newMsg).select('*').single();

      if (error) {
        console.error('❌ Error sending message:', error);
      } else {
        console.log('✅ Message sent:', data);
      }
      if (!error && data) {
        setText('');
        try {
          const channel = getChannel(`conv:${activeId}`);
          channel.publish('message:new', data);
        } catch {}
      }
    } finally {
      setSending(false);
    }
  };

  const onPickFile = () => fileInputRef.current?.click();

  const uploadAndSendAttachment = async (file: File) => {
    if (!user || !activeId || !file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${activeId}/${crypto.randomUUID()}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('chat-attachments').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeId,
          sender_id: user.id,
          content: text.trim() || '',
          attachment_url: path,
          attachment_name: file.name,
          attachment_type: file.type,
          attachment_size: file.size,
        })
        .select('*')
        .single();
      if (!error && data) {
        setText('');
        try {
          const channel = getChannel(`conv:${activeId}`);
          channel.publish('message:new', data);
        } catch {}
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadAndSendAttachment(f);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert(language === 'ru' ? 'Ошибка доступа к микрофону' : 'Microphone access error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setAudioBlob(null);
      setRecordingTime(0);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob || !activeId || !user) return;

    setSending(true);
    try {
      // Upload audio file with proper path
      const ext = 'webm';
      const path = `${activeId}/${crypto.randomUUID()}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(path, audioBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'audio/webm',
        });

      if (uploadError) throw uploadError;

      // Send message with audio attachment using same structure as file uploads
      const { data, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeId,
          sender_id: user.id,
          content: language === 'ru' ? 'Голосовое сообщение' : 'Voice message',
          attachment_url: path,
          attachment_name: `voice_${Date.now()}.webm`,
          attachment_type: 'audio/webm',
          attachment_size: audioBlob.size,
        })
        .select('*')
        .single();

      if (messageError) throw messageError;

      if (!messageError && data) {
        try {
          const channel = getChannel(`conv:${activeId}`);
          channel.publish('message:new', data);
        } catch {}
      }

      // Clear audio blob
      setAudioBlob(null);
      setRecordingTime(0);

    } catch (error) {
      console.error('Error sending voice message:', error);
      alert(language === 'ru' ? 'Ошибка отправки голосового сообщения' : 'Error sending voice message');
    } finally {
      setSending(false);
    }
  };

  const playAudio = async (messageId: string, audioPath: string) => {
    try {
      if (playingAudio === messageId) {
        // Stop current audio
        setPlayingAudio(null);
        return;
      }

      // Get signed URL if not cached
      let audioUrl = signedUrls[audioPath];
      if (!audioUrl) {
        const { data } = await supabase.storage
          .from('chat-attachments')
          .createSignedUrl(audioPath, 3600);

        if (data?.signedUrl) {
          audioUrl = data.signedUrl;
          setSignedUrls(prev => ({ ...prev, [audioPath]: audioUrl }));
        }
      }

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        setPlayingAudio(messageId);

        audio.onended = () => setPlayingAudio(null);
        audio.onerror = () => setPlayingAudio(null);

        await audio.play();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setPlayingAudio(null);
    }
  };

  // typing indicator
  useEffect(() => {
    if (!activeId || !user) return;
    const h = setTimeout(() => {}, 0);
    return () => clearTimeout(h);
  }, [activeId, user]);

  // Cleanup recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const notifyTyping = () => {
    if (!activeId || !user) return;
    try {
      const ch = getChannel(`conv:${activeId}`);
      ch.publish('typing', { userId: user.id, until: Date.now() + 3000 });
    } catch {}
  };

  const loadLawyers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'lawyer')
      .eq('is_verified', true)
      .order('full_name');
    setLawyers(data || []);
  };

  const inviteLawyer = async (lawyerId: string) => {
    if (!activeId || inviting) return;

    setInviting(true);
    try {
      // Найдем conversation
      const conv = conversations.find(c => c.id === activeId);
      console.log('🔍 Inviting lawyer - conversation:', conv);
      console.log('🔍 Inviting lawyer - lawyerId:', lawyerId);

      if (!conv) throw new Error('Conversation not found');

      // Сначала проверим, есть ли уже sales_request для этого property
      const { data: existingRequests } = await supabase
        .from('sales_requests')
        .select('*')
        .eq('property_id', conv.property_id)
        .eq('buyer_id', conv.buyer_id)
        .eq('realtor_id', conv.realtor_id);

      console.log('🔍 Existing sales requests:', existingRequests);

      if (existingRequests && existingRequests.length > 0) {
        // Обновляем существующий sales_request
        const { error, data } = await supabase
          .from('sales_requests')
          .update({ lawyer_id: lawyerId })
          .eq('id', existingRequests[0].id)
          .select();

        console.log('🔄 Update result:', { error, data });
        if (error) throw error;

        // Проверим, что sales_request действительно обновился
        const { data: verifyData } = await supabase
          .from('sales_requests')
          .select('*')
          .eq('lawyer_id', lawyerId)
          .eq('property_id', conv.property_id);
        console.log('✅ Verification - lawyer now has sales_requests:', verifyData);
      } else {
        // Создаем новый sales_request
        const { error, data } = await supabase
          .from('sales_requests')
          .insert({
            property_id: conv.property_id,
            buyer_id: conv.buyer_id,
            realtor_id: conv.realtor_id,
            lawyer_id: lawyerId,
            status: 'pending',
            sale_price_usdt: 100000
          })
          .select();

        console.log('➕ Insert result:', { error, data });
        if (error) throw error;

        // Проверим, что sales_request действительно создался
        const { data: verifyData } = await supabase
          .from('sales_requests')
          .select('*')
          .eq('lawyer_id', lawyerId)
          .eq('property_id', conv.property_id);
        console.log('✅ Verification - lawyer now has sales_requests:', verifyData);
      }

      setShowInviteLawyer(false);
      alert(t('chats.lawyerInvited') || 'Юрист приглашен в чат');

      // Подождем немного и перезагрузим
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('❌ Error inviting lawyer:', err);
      alert('Ошибка при приглашении юриста: ' + (err as Error).message);
    } finally {
      setInviting(false);
    }
  };

  // Загружаем юристов при открытии модального окна
  useEffect(() => {
    if (showInviteLawyer) {
      loadLawyers();
    }
  }, [showInviteLawyer]);

  const activeConv = useMemo(() => conversations.find((c) => c.id === activeId), [conversations, activeId]);
  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      const other = getOtherName(c).toLowerCase();
      const title = (c.property?.title || '').toLowerCase();
      return other.includes(q) || title.includes(q);
    });
  }, [conversations, query]);

  const groupedMessages = useMemo(() => {
    const groups: { date: string; items: any[] }[] = [];
    let currentDate = '';
    for (const m of messages) {
      const d = new Date(m.created_at);
      const key = d.toDateString();
      if (key !== currentDate) {
        groups.push({ date: m.created_at, items: [m] });
        currentDate = key;
      } else {
        groups[groups.length - 1].items.push(m);
      }
    }
    return groups;
  }, [messages]);

  const otherParticipantId = useMemo(() => {
    if (!user || !activeConv) return null;
    return activeConv.buyer_id === user.id ? activeConv.realtor_id : activeConv.buyer_id;
  }, [activeConv, user]);

  // флаг: последнее мое сообщение прочитано (по наличию receipt другой стороны)
  const lastOwnMessage = useMemo(() => {
    if (!user) return null;
    const mine = [...messages].filter((m) => m.sender_id === user.id);
    return mine.length ? mine[mine.length - 1] : null;
  }, [messages, user]);

  const [lastOwnRead, setLastOwnRead] = useState(false);
  useEffect(() => {
    (async () => {
      if (!lastOwnMessage || !otherParticipantId) { setLastOwnRead(false); return; }
      const { data } = await supabase
        .from('message_receipts')
        .select('id')
        .eq('message_id', lastOwnMessage.id)
        .eq('user_id', otherParticipantId)
        .maybeSingle();
      setLastOwnRead(!!data);
    })();
  }, [lastOwnMessage, otherParticipantId]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600"><Loader2 className="w-6 h-6 animate-spin" /></div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700">{t('chats.loginToOpen')}</div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-violet-50">
      <div className={`max-w-7xl mx-auto ${activeId ? 'px-0 py-0 lg:px-6 lg:py-8' : 'px-4 md:px-6 lg:px-8 py-6 md:py-8'}`}>
        {/* Header - скрыт на мобильных когда выбран чат */}
        <div className={`mb-6 md:mb-8 flex items-center justify-between ${activeId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{t('chats.title')}</h1>
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 lg:grid-cols-12 ${activeId ? 'gap-0 lg:gap-6' : 'gap-5 md:gap-6'} items-start`}>
          {/* Sidebar */}
          <aside className={`lg:col-span-4 xl:col-span-3 bg-white/90 backdrop-blur border border-gray-200 rounded-2xl shadow-sm p-4 ${activeId ? 'hidden lg:block' : 'block'}`}>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('chats.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white"
              />
            </div>

            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-600">{t('chats.dialogs')}</div>
              <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{filtered.length}</div>
            </div>

            <div className="divide-y">
              {loading ? (
                <div className="py-10 flex items-center justify-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <div className="py-10 text-center text-gray-600">
                  <div className="mx-auto mb-3 w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-gray-500" />
                  </div>
                  {t('common.notFound')}
                </div>
              ) : (
                <ul className="-my-2">
                  {filtered.map((c) => {
                    const isActive = activeId === c.id;
                    const otherName = getOtherName(c);
                    const otherProfile = user?.id === c.buyer_id ? c.realtor : c.buyer;
                    return (
                      <li key={c.id} className="py-2">
                        <button onClick={() => setActiveId(c.id)} className={`w-full text-left px-3 py-3 rounded-xl transition-all ${isActive ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'}`}>
                          <div className="flex items-center gap-3">
                            {getUserAvatar(
                              otherProfile,
                              otherName,
                              `w-10 h-10 rounded-xl ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="font-semibold text-gray-900 truncate">{otherName}</div>
                                {c.property?.title && (
                                  <div className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                    <Building2 className="w-3 h-3" />
                                    <span className="truncate max-w-[140px]">{c.property.title}</span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-0.5 text-xs text-gray-500 flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                {lastActivityLabel(c.last_message_at)}
                              </div>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Chat panel */}
          <section className={`lg:col-span-8 xl:col-span-9 bg-white/90 backdrop-blur border border-gray-200 lg:rounded-2xl shadow-sm flex flex-col ${activeId ? 'h-screen lg:h-[76vh] rounded-none lg:rounded-2xl' : 'hidden lg:flex h-[76vh]'}`}>
            {/* Chat header */}
            <div className="p-4 border-b flex items-center justify-between">
              {activeConv ? (
                <div className="flex items-center gap-3 min-w-0">
                  {/* Back button for mobile */}
                  <button
                    onClick={() => setActiveId('')}
                    className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  {getUserAvatar(
                    user?.id === activeConv.buyer_id ? activeConv.realtor : activeConv.buyer,
                    getOtherName(activeConv),
                    "w-10 h-10 rounded-xl bg-blue-100 text-blue-700"
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{getOtherName(activeConv)}</div>
                    {activeMeta?.property && (
                      <div className="text-xs text-gray-600 truncate inline-flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <Link to={`/properties/${activeMeta.property.id}`} className="truncate max-w-[240px] text-blue-700 hover:text-blue-900">{activeMeta.property.title}</Link>
                        {activeMeta.sale && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{t('nav.deals')}: {getSaleStatusLabel(activeMeta.sale.status)}</span>
                        )}
                        {activeMeta.invoice && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">Invoice: {getInvoiceStatusLabel(activeMeta.invoice.status)}</span>
                        )}
                      </div>
                    )}
                    {Date.now() < typingUntil && (
                      <div className="text-[11px] text-blue-600 mt-0.5">{t('chats.typing')}</div>
                    )}
                    {activeMeta?.sale && (
                      <div className="mt-1 text-xs">
                        <Link to={`/sales/${activeMeta.sale.id}`} className="inline-flex items-center text-blue-700 hover:text-blue-900">Открыть детали сделки <ArrowLeft className="w-3 h-3 rotate-180 ml-1" /></Link>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  {language === 'ru' ? 'Выберите диалог' : 'Select a dialog'}
                </div>
              )}
              <div className="hidden sm:flex items-center gap-2">
                {/* Кнопка приглашения юриста для риелторов */}
                {profile?.role === 'realtor' && activeId && (
                  <button
                    onClick={() => setShowInviteLawyer(true)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {t('chats.inviteLawyer') || 'Пригласить юриста'}
                  </button>
                )}

                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border bg-white text-xs text-gray-600">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Live
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={listRef} className="relative flex-1 overflow-auto p-4 md:p-6 space-y-5 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-white to-blue-50/40">
              {activeId ? (
                groupedMessages.length === 0 ? (
                  <div className="h-full w-full flex items-center justify-center text-gray-500">
                    {language === 'ru' ? 'Нет сообщений' : 'No messages'}
                  </div>
                ) : (
                  groupedMessages.map((g, idx) => (
                    <div key={idx}>
                      <div className="sticky top-2 z-10 mb-3">
                        <div className="w-fit mx-auto text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 border">
                          {formatDateLabel(g.date)}
                        </div>
                      </div>
                      <div className="space-y-3">
                        {g.items.map((m: any) => {
                          const mine = m.sender_id === user!.id;
                          const hasFile = !!m.attachment_url;
                          const signed = hasFile ? signedUrls[m.id] : null;
                          const senderName = m.sender?.full_name || 'Unknown';
                          const senderRole = m.sender?.role;
                          const getRoleBadge = (role: string) => {
                            switch(role) {
                              case 'buyer': return { label: t('profile.role.buyer'), color: 'bg-gray-100 text-gray-700' };
                              case 'realtor': return { label: t('profile.role.realtor'), color: 'bg-blue-100 text-blue-700' };
                              case 'lawyer': return { label: t('profile.role.lawyer'), color: 'bg-green-100 text-green-700' };
                              case 'lovepay': return { label: 'Love&Pay', color: 'bg-purple-100 text-purple-700' };
                              default: return { label: role, color: 'bg-gray-100 text-gray-700' };
                            }
                          };
                          return (
                            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 shadow-sm ring-1 ${mine ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white ring-blue-500/20' : 'bg-white text-gray-900 ring-gray-200'}`}>
                                {!mine && (
                                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                                    <span className="text-sm font-medium text-gray-900">{senderName}</span>
                                    {senderRole && (
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(senderRole).color}`}>
                                        {getRoleBadge(senderRole).label}
                                      </span>
                                    )}
                                    {m.sender?.is_verified && (
                                      <span className="text-green-500 text-xs">✓</span>
                                    )}
                                  </div>
                                )}
                                {hasFile && (
                                  <div className="mb-2">
                                    {m.attachment_type?.startsWith('image/') && signed ? (
                                      <img src={signed} alt={m.attachment_name || ''} className="max-h-60 rounded-lg" />
                                    ) : m.attachment_type?.startsWith('audio/') ? (
                                      <div className={`inline-flex items-center gap-3 p-3 rounded-lg ${mine ? 'bg-white/20' : 'bg-gray-100'} min-w-[200px]`}>
                                        <button
                                          onClick={() => playAudio(m.id, m.attachment_url!)}
                                          className={`w-10 h-10 rounded-full flex items-center justify-center ${mine ? 'bg-white/30 text-white hover:bg-white/40' : 'bg-blue-600 text-white hover:bg-blue-700'} transition-colors`}
                                        >
                                          {playingAudio === m.id ? (
                                            <Pause className="w-5 h-5" />
                                          ) : (
                                            <Play className="w-5 h-5 ml-0.5" />
                                          )}
                                        </button>
                                        <div className="flex-1">
                                          <div className={`text-sm font-medium ${mine ? 'text-white' : 'text-gray-900'}`}>
                                            {language === 'ru' ? 'Голосовое сообщение' : 'Voice message'}
                                          </div>
                                          <div className={`text-xs ${mine ? 'text-white/80' : 'text-gray-500'}`}>
                                            {Math.round((m.attachment_size || 0) / 1024)} KB
                                          </div>
                                        </div>
                                        {/* Simple waveform visualization */}
                                        <div className="flex items-center gap-0.5">
                                          {Array.from({ length: 20 }).map((_, i) => (
                                            <div
                                              key={i}
                                              className={`w-0.5 rounded-full ${mine ? 'bg-white/60' : 'bg-gray-400'}`}
                                              style={{
                                                height: `${Math.random() * 20 + 8}px`
                                              }}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <a href={signed || '#'} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 underline ${mine ? 'text-white' : 'text-blue-700'}`}>
                                        <Paperclip className="w-4 h-4" /> {m.attachment_name || (language === 'ru' ? 'Файл' : 'File')} ({Math.round((m.attachment_size||0)/1024)} KB)
                                      </a>
                                    )}
                                  </div>
                                )}
                                {m.content && <div className="text-sm whitespace-pre-line break-words">{m.content}</div>}
                                <div className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? 'text-white/80' : 'text-gray-500'}`}>
                                  {formatTime(m.created_at)}
                                  {mine && lastOwnMessage && m.id === lastOwnMessage.id && lastOwnRead && (
                                    <CheckCheck className="w-3.5 h-3.5 inline ml-1" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center textcenter">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center shadow">
                    <MessageSquare className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="mt-4 text-gray-900 font-semibold text-lg">
                    {language === 'ru' ? 'Выберите диалог' : 'Select a Dialog'}
                  </div>
                  <div className="text-gray-600 text-sm mt-1">
                    {language === 'ru' ? 'Начните общение с риелтором или покупателем' : 'Start communication with a realtor or buyer'}
                  </div>
                </div>
              )}
              {showScrollDown && (
                <button onClick={() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }} className="absolute right-4 bottom-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-white text-gray-700 shadow hover:bg-gray-50">
                  <ChevronDown className="w-4 h-4" /> {language === 'ru' ? 'Вниз' : 'Down'}
                </button>
              )}
            </div>

            {/* Composer */}
            <div 
              className={`border-t p-3 md:p-4 flex flex-col gap-2 bg-white/80 ${isDragOver ? 'ring-2 ring-blue-300' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) uploadAndSendAttachment(f); }}
            >
              {/* Быстрые шаблоны - скрыты на мобильных */}
              <div className="hidden sm:flex items-center gap-2 flex-wrap">
                {(language === 'ru'
                  ? ['Здравствуйте!', 'Хочу посмотреть объект', 'Отправьте, пожалуйста, документы', 'Готов оплатить счет']
                  : ['Hello!', 'I want to view the property', 'Please send documents', 'Ready to pay the bill']
                ).map((tpl) => (
                  <button key={tpl} onClick={() => setText((prev) => (prev ? prev + ' ' + tpl : tpl))} className="px-2.5 py-1 rounded-lg border text-xs text-gray-700 hover:bg-gray-50">
                    {tpl}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => { setText(e.target.value); notifyTyping(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={activeId
                    ? (language === 'ru' ? 'Напишите сообщение…' : 'Write a message…')
                    : (language === 'ru' ? 'Сначала выберите диалог' : 'First select a dialog')
                  }
                  disabled={!activeId || sending}
                  className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white disabled:bg-gray-50"
                />
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                <button onClick={onPickFile} disabled={!activeId || uploading} className="inline-flex items-center gap-2 px-2 sm:px-3 py-2.5 rounded-2xl border border-gray-200 text-gray-700 bg-white disabled:opacity-50">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!activeId || sending}
                  className={`inline-flex items-center gap-2 px-2 sm:px-3 py-2.5 rounded-2xl border border-gray-200 disabled:opacity-50 transition-colors ${
                    isRecording
                      ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                      : 'text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!activeId || sending || (!text.trim())}
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white disabled:opacity-50 shadow hover:shadow-md active:scale-[0.99] transition"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span className="hidden sm:inline">{language === 'ru' ? 'Отправить' : 'Send'}</span>
                </button>
              </div>
              {isDragOver && (
                <div className="text-center text-xs text-blue-700">
                  {language === 'ru' ? 'Отпустите файл здесь, чтобы отправить' : 'Drop file here to send'}
                </div>
              )}

              {/* Recording UI */}
              {isRecording && (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-red-700">
                      {language === 'ru' ? 'Запись голосового сообщения' : 'Recording voice message'}
                    </div>
                    <div className="text-xs text-red-600">
                      {formatRecordingTime(recordingTime)}
                    </div>
                  </div>
                  <button
                    onClick={cancelRecording}
                    className="px-3 py-1.5 text-xs bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    {language === 'ru' ? 'Отмена' : 'Cancel'}
                  </button>
                </div>
              )}

              {/* Voice message preview */}
              {audioBlob && !isRecording && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-blue-700">
                      {language === 'ru' ? 'Голосовое сообщение готово' : 'Voice message ready'}
                    </div>
                    <div className="text-xs text-blue-600">
                      {formatRecordingTime(recordingTime)}
                    </div>
                  </div>
                  <button
                    onClick={() => setAudioBlob(null)}
                    className="px-3 py-1.5 text-xs bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    {language === 'ru' ? 'Удалить' : 'Delete'}
                  </button>
                  <button
                    onClick={sendVoiceMessage}
                    disabled={sending}
                    className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      language === 'ru' ? 'Отправить' : 'Send'
                    )}
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Модальное окно выбора юриста */}
      {showInviteLawyer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('chats.selectLawyer') || 'Выберите юриста'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {t('chats.selectLawyerDesc') || 'Выберите юриста для участия в этом чате'}
              </p>
            </div>

            <div className="max-h-96 overflow-auto">
              {lawyers.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  {t('chats.noLawyers') || 'Нет доступных юристов'}
                </div>
              ) : (
                <div className="divide-y">
                  {lawyers.map((lawyer) => (
                    <button
                      key={lawyer.id}
                      onClick={() => inviteLawyer(lawyer.id)}
                      disabled={inviting}
                      className="w-full p-4 text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-700 font-semibold">
                            {lawyer.full_name?.charAt(0) || 'L'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{lawyer.full_name}</div>
                          <div className="text-sm text-gray-600">{lawyer.email}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowInviteLawyer(false)}
                disabled={inviting}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t('common.cancel') || 'Отмена'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 