// File: pages/index.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';

interface Message {
  role: 'user' | 'ai';
  text?: string;
  image?: string;
  id?: string;
  time?: number;
}

interface ChatHistoryItem {
  id: string;
  title: string;
  messages: Message[];
}

export default function Home() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistories, setChatHistories] = useState<ChatHistoryItem[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarClosing, setSidebarClosing] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const [commandCount, setCommandCount] = useState(0);
  const [extendedCooldown, setExtendedCooldown] = useState(false);

  const chatWindowRef = useRef<HTMLDivElement | null>(null);
  const imagePreviewUrl = useRef<string | null>(null);

  /* ---------- Auth check on mount ---------- */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      if (!isLoggedIn) {
        router.push('/login');
      } else {
        loadChatHistories();
      }
    }
    return () => {
      if (imagePreviewUrl.current) {
        URL.revokeObjectURL(imagePreviewUrl.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ... (semua fungsi dan useEffect lainnya sama seperti sebelumnya) ... */
  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, aiTyping]);

  const scrollToBottom = () => {
    if (chatWindowRef.current) {
      setTimeout(() => {
        chatWindowRef.current!.scrollTop = chatWindowRef.current!.scrollHeight;
      }, 50);
    }
  };

  const loadChatHistories = () => {
    try {
      const saved = localStorage.getItem('allChatHistories');
      if (saved) {
        const parsed: ChatHistoryItem[] = JSON.parse(saved);
        setChatHistories(parsed);
        if (parsed.length > 0) {
          const last = parsed[parsed.length - 1];
          setMessages(last.messages || []);
          setCurrentChatId(last.id);
        } else {
          const id = `chat-${Date.now()}`;
          const newChat: ChatHistoryItem = { id, title: 'Obrolan Baru', messages: [] };
          setChatHistories([newChat]);
          setCurrentChatId(id);
          localStorage.setItem('allChatHistories', JSON.stringify([newChat]));
        }
      } else {
        const id = `chat-${Date.now()}`;
        const newChat: ChatHistoryItem = { id, title: 'Obrolan Baru', messages: [] };
        setChatHistories([newChat]);
        setCurrentChatId(id);
        localStorage.setItem('allChatHistories', JSON.stringify([newChat]));
      }
    } catch (err) {
      console.error('Gagal load chat histories', err);
    }
  };

  const saveChatHistory = (updatedMessages: Message[], chatId: string) => {
    try {
      const chatTitle = updatedMessages[0]?.text?.substring(0, 30) || 'Obrolan Baru';
      const updated = [...chatHistories];
      const idx = updated.findIndex((c) => c.id === chatId);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], title: chatTitle, messages: updatedMessages };
      } else {
        updated.push({ id: chatId, title: chatTitle, messages: updatedMessages });
      }
      setChatHistories(updated);
      localStorage.setItem('allChatHistories', JSON.stringify(updated));
    } catch (err) {
      console.error('Gagal save chat', err);
    }
  };

  const startNewChat = () => {
    const newChatId = `chat-${Date.now()}`;
    const newChat: ChatHistoryItem = { id: newChatId, title: 'Obrolan Baru', messages: [] };
    const updated = [...chatHistories, newChat];
    setChatHistories(updated);
    setMessages([]);
    setCurrentChatId(newChatId);
    localStorage.setItem('allChatHistories', JSON.stringify(updated));
    setIsSidebarOpen(false);
  };

  const loadChat = (chatId: string) => {
    const chat = chatHistories.find((c) => c.id === chatId);
    if (chat) {
      setMessages(chat.messages || []);
      setCurrentChatId(chatId);
      setIsSidebarOpen(false);
    }
  };

  const deleteChat = (chatId: string) => {
    const isDeletingCurrent = chatId === currentChatId;
    const updated = chatHistories.filter((c) => c.id !== chatId);
    setChatHistories(updated);
    localStorage.setItem('allChatHistories', JSON.stringify(updated));
    if (isDeletingCurrent) {
      if (updated.length > 0) {
        loadChat(updated[updated.length - 1].id);
      } else {
        startNewChat();
      }
    }
  };

  const clearAllHistory = () => {
    localStorage.removeItem('allChatHistories');
    setChatHistories([]);
    setMessages([]);
    setCurrentChatId(null);
    setIsSidebarOpen(false);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    router.push('/login');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (imagePreviewUrl.current) {
        URL.revokeObjectURL(imagePreviewUrl.current);
      }
      imagePreviewUrl.current = URL.createObjectURL(file);
      setImage(file);
    }
  };

  const handleImageDelete = () => {
    if (imagePreviewUrl.current) {
      URL.revokeObjectURL(imagePreviewUrl.current);
      imagePreviewUrl.current = null;
    }
    setImage(null);
  };

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading || isCooldown || extendedCooldown || (!input.trim() && !image)) {
        return;
    }

    const userMsg: Message = {
      role: 'user',
      text: input.trim() ? input.trim() : undefined,
      id: `m-${Date.now()}`,
      time: Date.now(),
    };

    if (image) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        userMsg.image = reader.result as string;
        pushUserMessageAndSend(userMsg);
      };
      reader.readAsDataURL(image);
    } else {
      pushUserMessageAndSend(userMsg);
    }
  };

  const pushUserMessageAndSend = async (userMsg: Message) => {
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (imagePreviewUrl.current) {
      handleImageDelete();
    }
    
    setCommandCount(prev => {
        const newCount = prev + 1;
        if (newCount >= 7) {
            setExtendedCooldown(true);
            setTimeout(() => setExtendedCooldown(false), 10000);
            return 0;
        }
        return newCount;
    });

    setIsCooldown(true);
    setTimeout(() => setIsCooldown(false), 5000);

    await sendToServer(userMsg);
  };

  const sendToServer = async (message: Message) => {
    setIsLoading(true);
    setAiTyping(true);
    try {
      const body = {
        message: message.text || '',
        image: message.image || null,
        chatId: currentChatId,
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Network error');

      const data = await res.json();
      const aiMsg: Message = {
        role: 'ai',
        text: data.text ?? 'Maaf, tidak ada respon.',
        id: `m-${Date.now()}-ai`,
        time: Date.now(),
      };

      await new Promise((r) => setTimeout(r, 300));
      setMessages((prev) => {
        const updatedMessages = [...prev, aiMsg];
        if (currentChatId) {
            saveChatHistory(updatedMessages, currentChatId);
        }
        return updatedMessages;
      });
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: '⚠️ Maaf server sedang sibuk, mohon coba beberapa menit lagi.', id: `m-${Date.now()}-err`, time: Date.now() },
      ]);
    } finally {
      setIsLoading(false);
      setAiTyping(false);
    }
  };

  const toggleSidebar = () => {
    if (isSidebarOpen) {
      setSidebarClosing(true);
      setTimeout(() => {
        setIsSidebarOpen(false);
        setSidebarClosing(false);
      }, 300);
    } else {
      setIsSidebarOpen(true);
      setSidebarClosing(false);
    }
  };

  const fmtTime = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };


  /* ... (semua JSX rendering sama seperti sebelumnya) ... */
  return (
    <div className={styles.container}>
      {isSidebarOpen && <div className={styles.overlay} onClick={toggleSidebar} />}

      <button
        className={styles.menuButton}
        onClick={toggleSidebar}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      <aside
        className={`${styles.sidebar} ${
          isSidebarOpen ? styles.sidebarOpen : sidebarClosing ? styles.sidebarClosing : ''
        }`}
        aria-hidden={!isSidebarOpen}
      >
        <div className={styles.sidebarHeader}>
          <h1 className={styles.title}>💬 Amigo AI</h1>
          <button className={styles.newChatButton} onClick={startNewChat}>
            ➕ Obrolan Baru
          </button>
        </div>

        <div className={styles.historyList}>
          {chatHistories.length === 0 && (
            <p className={styles.emptyHistory}>Belum ada riwayat.</p>
          )}

          {chatHistories.map((chat) => (
            <div
              key={chat.id}
              className={`${styles.historyItem} ${
                currentChatId === chat.id ? styles.activeHistoryItem : ''
              }`}
            >
              <button
                className={styles.historyItemText}
                onClick={() => loadChat(chat.id)}
              >
                {chat.title}
              </button>
              <button
                className={styles.deleteHistoryButton}
                onClick={() => deleteChat(chat.id)}
                title="Hapus"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        
        <div className={styles.sidebarFooter}>
            <button className={styles.clearAllButton} onClick={clearAllHistory}>
                🗑 Hapus Semua Riwayat
            </button>
            <button className={styles.logoutButton} onClick={handleLogout}>
                Keluar
            </button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <div className={styles.chatWindow} ref={chatWindowRef}>
          {messages.length === 0 && (
            <div className={styles.emptyMessage}>Mulai percakapan Anda...</div>
          )}

          {messages.map((msg, idx) => (
            <div
              className={`${styles.message} ${
                msg.role === 'user' ? styles.userMessage : styles.aiMessage
              }`}
              key={msg.id ?? `${msg.role}-${idx}-${msg.time ?? idx}`}
            >
              {msg.text && <p className={styles.messageText}>{msg.text}</p>}
              {msg.image && (
                <img src={msg.image} alt="uploaded" className={styles.chatImage} />
              )}
              {msg.time && (
                <div className={styles.msgMeta}>
                  <span className={styles.msgTime}>{fmtTime(msg.time)}</span>
                </div>
              )}
            </div>
          ))}

          {aiTyping && (
            <div className={`${styles.message} ${styles.aiMessage}`}>
              <div className={styles.typingDots}>
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          {isLoading && !aiTyping && (
            <div className={`${styles.message} ${styles.aiMessage}`}>
              <p>Sedang memproses...</p>
            </div>
          )}
        </div>

        {image && imagePreviewUrl.current && (
          <div className={styles.imagePreview}>
            <img src={imagePreviewUrl.current} alt="preview" className={styles.chatImage} />
            <button className={styles.deleteImageButton} onClick={handleImageDelete}>
              ✕
            </button>
          </div>
        )}

        <form className={styles.inputContainer} onSubmit={sendMessage}>
          <div className={styles.inputGroup}>
            <input
              className={styles.input}
              type="text"
              placeholder={extendedCooldown ? 'Tunggu 10 detik...' : isCooldown ? 'Tunggu sebentar...' : 'Tulis pesan Anda...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              aria-label="Pesan"
              disabled={isLoading || isCooldown || extendedCooldown}
            />

            <button
              className={styles.button}
              type="submit"
              disabled={isLoading || isCooldown || extendedCooldown || (!input.trim() && !image)}
            >
              {isLoading ? '⏳' : isCooldown || extendedCooldown ? '⏳' : 'Kirim'}
            </button>
          </div>

          <input
            id="file-input"
            className={styles.fileInput}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={isLoading || isCooldown || extendedCooldown}
          />
          <label htmlFor="file-input" className={styles.fileInputLabel}>
            <span className={styles.fileInputLabelText}>Unggah Gambar</span>
            <span className={styles.fileInputIcon}>🖼️</span>
          </label>
        </form>
      </main>
    </div>
  );
}