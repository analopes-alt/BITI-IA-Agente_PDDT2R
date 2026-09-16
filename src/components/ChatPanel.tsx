import React, { useState, useEffect, useRef } from "react";
import { Send, Sparkles, RefreshCw, FileText, Bot, User, CheckCircle, XCircle, ChevronDown, HelpCircle, ArrowRight, Plus, MessageSquare, Trash2, Database, Layers, Paperclip, X, AlertCircle, History, Clock, Pencil, Check } from "lucide-react";
import { ChatMessage, ClientGroup } from "../types";

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: string;
}

interface ChatPanelProps {
  selectedClientId: string;
  selectedRobotId: string;
  clientGroups: ClientGroup[];
  onResetFilters: () => void;
  onOpenSidebar?: () => void;
  userEmail?: string;
  token?: string | null;
  onRefresh?: () => void;
  selectedFileIds?: string[];
  activeSessionId?: string;
  onSessionChange?: (newSessionId: string) => void;
}

const QUICK_PROMPTS = [
  "Quais são todos os robôs do Cliente A?",
  "Como funciona o fluxo do Robô de Abertura de Contas?",
  "O que o robô faz em caso de divergência de conciliação bancária?",
  "Quais sites ou sistemas o emissor de notas fiscais acessa?"
];

export default function ChatPanel({
  selectedClientId,
  selectedRobotId,
  clientGroups,
  onResetFilters,
  onOpenSidebar,
  userEmail,
  token,
  onRefresh,
  selectedFileIds = [],
  activeSessionId: propActiveSessionId,
  onSessionChange
}: ChatPanelProps) {
  // Estado do histórico de conversas (sessões) com persistência local
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem("biti9_chat_sessions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Erro ao ler sessões de chat salvas:", e);
      }
    }
    return [
      {
        id: "default_session",
        title: "Dúvidas Gerais de PDDs",
        messages: [
          {
            id: "welcome",
            sender: "assistant",
            text: "Olá! Sou o **Especialista em RPA da biti9**.\n\nFui treinado para analisar os seus **Process Design Documents (PDDs)** e planilhas/documentos **T2R**.\n\n**Como iniciar:**\nAnexe seus arquivos de PDD (em PDF ou Word) ou planilhas T2R (em Excel ou CSV) diretamente na caixa de entrada abaixo utilizando o botão de clipe (anexo) ou simplesmente arraste-os para cá. Farei uma análise em tempo real para responder suas dúvidas com precisão corporativa!",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return propActiveSessionId || localStorage.getItem("biti9_active_session_id") || "default_session";
  });

  // Sync prop changes if external component updates activeSessionId
  useEffect(() => {
    if (propActiveSessionId && propActiveSessionId !== activeSessionId) {
      setActiveSessionId(propActiveSessionId);
    }
  }, [propActiveSessionId]);

  // Encontra a sessão ativa
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || {
    id: "default_session",
    title: "Dúvidas Gerais de PDDs",
    messages: []
  };

  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success"
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");

  const handleStartRename = (e: React.MouseEvent, sess: ChatSession) => {
    e.stopPropagation();
    setEditingSessionId(sess.id);
    setEditingTitle(sess.title);
  };

  const handleSaveRename = async (sessionId: string, e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation();
      if ("preventDefault" in e) e.preventDefault();
    }

    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingSessionId(null);
      return;
    }

    // 1. Atualizar no estado do React e no localStorage
    const updatedSessions = sessions.map(s => {
      if (s.id === sessionId) {
        return { ...s, title: trimmed };
      }
      return s;
    });
    setSessions(updatedSessions);
    localStorage.setItem("biti9_chat_sessions", JSON.stringify(updatedSessions));
    setEditingSessionId(null);

    // 2. Persistir no servidor backend
    try {
      await fetch(`/api/conversations/${encodeURIComponent(sessionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          userEmail
        })
      });
    } catch (err) {
      console.error("Erro ao atualizar título da conversa no servidor:", err);
    }
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 6000);
  };

  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [expandedSourceKey, setExpandedSourceKey] = useState<string | null>(null);
  const [currentSources, setCurrentSources] = useState<any[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; type: string; base64: string }>>([]);
  const [isDragging, setIsDragging] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persiste as sessões de conversa e a sessão ativa
  useEffect(() => {
    localStorage.setItem("biti9_chat_sessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem("biti9_active_session_id", activeSessionId);
  }, [activeSessionId]);

  const messages = activeSession.messages;

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  // Encontra nome do filtro atual
  let filterLabel = "";
  if (selectedClientId) {
    const client = clientGroups.find(c => c.id === selectedClientId);
    if (client) {
      filterLabel = `Cliente: ${client.name}`;
      if (selectedRobotId) {
        const robot = client.robots.find(r => r.id === selectedRobotId);
        if (robot) {
          filterLabel += ` > Robô: ${robot.name}`;
        }
      }
    }
  }

  // Cria uma nova sessão de conversa
  const handleNewSession = () => {
    const newId = `session_${Date.now()}`;
    const newSess: ChatSession = {
      id: newId,
      title: "Nova Conversa",
      messages: [
        {
          id: `welcome_${Date.now()}`,
          sender: "assistant",
          text: "Olá! Sou o **Especialista em RPA da biti9**.\n\nAnexe seus arquivos de PDD ou tabelas T2R diretamente aqui utilizando o ícone de clipe abaixo e faça perguntas. Analisarei todo o conteúdo em tempo real!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setSessions(prev => [newSess, ...prev]);
    setActiveSessionId(newId);
    if (onSessionChange) onSessionChange(newId);
    setExpandedSourceKey(null);
    setCurrentSources([]);
  };

  // Exclui uma sessão de conversa
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length === 1) {
      // Reseta a única existente
      const newId = `session_${Date.now()}`;
      setSessions([
        {
          id: newId,
          title: "Dúvidas Gerais de PDDs",
          messages: [
            {
              id: "welcome",
              sender: "assistant",
              text: "Olá! Sou o **Especialista em RPA da biti9**.\n\nFui treinado para responder sobre os **Process Design Documents (PDDs)** e planilhas/documentos **T2R** dos nossos clientes. Você pode fazer perguntas sobre qualquer processo sincronizado (fluxos, credenciais, conexões de sistemas, regras de negócio ou tratativas de erro).\n\n*Utilize a barra de pesquisa ou clique nos clientes na barra lateral esquerda se desejar filtrar suas perguntas por um cliente ou robô específico!*",
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setActiveSessionId(newId);
      if (onSessionChange) onSessionChange(newId);
      return;
    }

    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      const nextId = filtered[0].id;
      setActiveSessionId(nextId);
      if (onSessionChange) onSessionChange(nextId);
    }
  };

  // Limpa as mensagens da conversa atual, mantendo o histórico intacto e reiniciando a sessão atual
  const handleClearCurrentChat = () => {
    setSessions(prevSessions => {
      return prevSessions.map(sess => {
        if (sess.id === activeSession.id) {
          return {
            ...sess,
            messages: [
              {
                id: `welcome_${Date.now()}`,
                sender: "assistant",
                text: "Olá! As mensagens anteriores deste chat foram limpas.\n\nComo posso ajudar com a análise dos seus PDDs ou T2R agora?",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]
          };
        }
        return sess;
      });
    });
    setExpandedSourceKey(null);
    setCurrentSources([]);
  };

  // Seleção e upload de múltiplos arquivos para o chat
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validExtensions = ['.png', '.jpg', '.jpeg', '.pdf', '.xlsx', '.csv', '.docx', '.txt'];
    
    Array.from(files).forEach((file: any) => {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(fileExtension)) {
        alert(`O arquivo "${file.name}" tem um formato não suportado. Escolha imagens (.png, .jpg, .jpeg) ou documentos (.pdf, .xlsx, .csv, .docx, .txt).`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAttachedFiles(prev => [
          ...prev,
          {
            name: file.name,
            type: file.type || 'application/octet-stream',
            base64: base64
          }
        ]);
      };
      reader.onerror = (error) => {
        console.error("Erro ao ler arquivo:", error);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const validExtensions = ['.png', '.jpg', '.jpeg', '.pdf', '.xlsx', '.csv', '.docx', '.txt'];
    
    Array.from(files).forEach((file: any) => {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(fileExtension)) {
        alert(`O arquivo "${file.name}" tem um formato não suportado. Escolha imagens (.png, .jpg, .jpeg) ou documentos (.pdf, .xlsx, .csv, .docx, .txt).`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAttachedFiles(prev => [
          ...prev,
          {
            name: file.name,
            type: file.type || 'application/octet-stream',
            base64: base64
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSendMessage = async (textToSend: string) => {
    if ((!textToSend.trim() && attachedFiles.length === 0) || loading) return;

    const filesToUpload = [...attachedFiles];
    setAttachedFiles([]);

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: "user",
      text: textToSend || `[Arquivos anexados: ${filesToUpload.map(f => f.name).join(", ")}]`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachments: filesToUpload.map(f => ({ name: f.name, type: f.type, base64: f.base64 }))
    };

    // Adiciona a mensagem do usuário à sessão ativa e atualiza o título se necessário
    setSessions(prevSessions => {
      return prevSessions.map(sess => {
        if (sess.id === activeSession.id) {
          const updatedMessages = [...sess.messages, userMessage];
          let updatedTitle = sess.title;
          if (sess.title === "Nova Conversa" || sess.title === "Dúvidas Gerais de PDDs") {
            const displayTitle = textToSend || `Arquivos: ${filesToUpload.map(f => f.name).join(", ")}`;
            updatedTitle = displayTitle.length > 25 ? displayTitle.substring(0, 25) + "..." : displayTitle;
          }
          return {
            ...sess,
            title: updatedTitle,
            messages: updatedMessages
          };
        }
        return sess;
      });
    });

    setInputText("");
    setLoading(true);
    setExpandedSourceKey(null);

    try {
      // Histórico das últimas 5 mensagens da sessão ativa
      const historyContext = messages.slice(-5).map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: textToSend || `Analise os arquivos anexados: ${filesToUpload.map(f => f.name).join(", ")}`,
          clientId: selectedClientId,
          robotId: selectedRobotId,
          history: historyContext,
          sessionId: activeSession.id,
          attachments: filesToUpload.map(f => ({ name: f.name, type: f.type, base64: f.base64 })),
          userEmail: userEmail,
          selectedFileIds: selectedFileIds
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const detailedError = errData.error || `Erro de rede ou servidor (${res.status} ${res.statusText})`;
        throw new Error(detailedError);
      }

      const data = await res.json();
      const assistantMessageId = `msg_${Date.now() + 1}`;

      const initialAssistantMessage: ChatMessage = {
        id: assistantMessageId,
        sender: "assistant",
        text: "",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources
      };

      setSessions(prevSessions => {
        return prevSessions.map(sess => {
          if (sess.id === activeSession.id) {
            return {
              ...sess,
              messages: [...sess.messages, initialAssistantMessage]
            };
          }
          return sess;
        });
      });

      if (data.sources && data.sources.length > 0) {
        setCurrentSources(data.sources);
      } else {
        setCurrentSources([]);
      }

      // Efeito de digitação suave (Simulando streaming de texto)
      setIsTyping(true);
      const fullText = data.answer || "Desculpe, não consegui obter resposta.";
      const words = fullText.split(" ");
      let currentWordIdx = 0;

      const typeNextWord = () => {
        if (currentWordIdx < words.length) {
          const nextText = words.slice(0, currentWordIdx + 1).join(" ");
          setSessions(prevSessions => {
            return prevSessions.map(sess => {
              if (sess.id === activeSession.id) {
                return {
                  ...sess,
                  messages: sess.messages.map(m => {
                    if (m.id === assistantMessageId) {
                      return { ...m, text: nextText };
                    }
                    return m;
                  })
                };
              }
              return sess;
            });
          });
          currentWordIdx++;
          setTimeout(typeNextWord, 15);
        } else {
          setIsTyping(false);
          setLoading(false);
        }
      };

      // Inicia o fluxo de digitação
      typeNextWord();

    } catch (e: any) {
      console.error(e);
      const errorMessage: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        sender: "assistant",
        text: `Erro no Chat Especialista: ${e.message || "Erro desconhecido."}`,
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setSessions(prevSessions => {
        return prevSessions.map(sess => {
          if (sess.id === activeSession.id) {
            return {
              ...sess,
              messages: [...sess.messages, errorMessage]
            };
          }
          return sess;
        });
      });
      setLoading(false);
    }
  };

  // Renderiza textos markdown simples (bold, itálico, tópicos) de forma limpa e bonita
  const formatMarkdown = (text: string) => {
    return text.split("\n").map((line, i) => {
      let content = line;
      
      // Suporte a imagens no formato ![alt](url)
      const imgMatch = content.match(/^!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        return (
          <div key={i} className="my-3 flex justify-center w-full">
            <img 
              src={imgMatch[2]} 
              alt={imgMatch[1]} 
              className="rounded-xl border border-white/10 max-h-64 object-cover shadow-lg aspect-video w-full max-w-lg" 
              referrerPolicy="no-referrer"
            />
          </div>
        );
      }
      
      // Cabeçalhos (### ou ##)
      if (content.startsWith("### ")) {
        return <h4 key={i} className="text-sm font-semibold text-slate-100 mt-3 mb-1.5">{content.replace("### ", "")}</h4>;
      }
      if (content.startsWith("## ")) {
        return <h3 key={i} className="text-base font-bold text-sky-400 mt-4 mb-2">{content.replace("## ", "")}</h3>;
      }
      if (content.startsWith("# ")) {
        return <h2 key={i} className="text-lg font-bold text-sky-300 mt-4 mb-2">{content.replace("# ", "")}</h2>;
      }

      // Tópicos com asterisco ou hífen
      if (content.trim().startsWith("* ") || content.trim().startsWith("- ")) {
        const cleaned = content.replace(/^[\s*-]+/, "");
        return (
          <div key={i} className="flex items-start gap-2 pl-3 my-1">
            <span className="text-sky-400 select-none mt-1.5 text-[6px]">●</span>
            <span className="text-sm text-slate-300">{renderInlineStyles(cleaned)}</span>
          </div>
        );
      }

      // Tópicos numerados
      const numMatch = content.trim().match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <div key={i} className="flex items-start gap-2 pl-3 my-1">
            <span className="text-sky-400 font-mono text-xs font-semibold">{numMatch[1]}.</span>
            <span className="text-sm text-slate-300">{renderInlineStyles(numMatch[2])}</span>
          </div>
        );
      }

      return (
        <p key={i} className="text-sm text-slate-300 leading-relaxed my-1.5 min-h-[1px]">
          {renderInlineStyles(content)}
        </p>
      );
    });
  };

  const renderInlineStyles = (txt: string) => {
    const parts = txt.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={idx} className="text-slate-100 font-semibold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={idx} className="bg-slate-950 px-1.5 py-0.5 rounded text-xs font-mono text-sky-400 border border-slate-850">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return (
    <div id="chat_central_container" className="relative flex h-full w-full bg-[#05070A] overflow-hidden">
      
      {/* JANELA DE CONVERSA ATIVA (CENTRO) */}
      <div 
        id="chat_panel" 
        onDragOver={handleDragOver}
        className="relative flex-1 flex flex-col h-full bg-[#05070A] text-slate-300 overflow-hidden"
      >
        
        {/* Toast Notification */}
        {toast.show && (
          <div className="absolute top-16 right-4 z-40 max-w-md animate-slide-in pointer-events-auto">
            {toast.type === "success" ? (
              <div className="bg-[#091512]/95 border border-emerald-500/30 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-white">✓ Sincronização Realizada</p>
                  <p className="text-[11px] text-emerald-300/90 mt-0.5">{toast.message}</p>
                </div>
                <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="text-emerald-400 hover:text-emerald-200 ml-auto cursor-pointer p-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="bg-[#1C0F12]/95 border border-rose-500/30 text-rose-200 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-start gap-3">
                <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-white">✕ Falha ao definir banco de dados</p>
                  <p className="text-[11px] text-rose-300/90 mt-0.5">{toast.message}</p>
                </div>
                <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="text-rose-400 hover:text-rose-200 ml-auto cursor-pointer p-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Glow Decorativo Imersivo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-600/5 blur-[120px] pointer-events-none rounded-full z-0"></div>

        {/* Sub-header com Filtro Ativo */}
        <div className="bg-[#080B12] p-3 px-4 border-b border-white/5 flex items-center justify-between z-10 relative">
          <div className="flex items-center gap-2">
            {onOpenSidebar && (
              <button
                onClick={onOpenSidebar}
                className="lg:hidden p-1.5 hover:bg-white/5 rounded-md text-slate-400 hover:text-slate-200 transition-colors mr-1 flex items-center justify-center cursor-pointer border border-white/5 bg-white/[0.02]"
                title="Ver Clientes e Robôs"
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
              </button>
            )}
            <Bot className="w-4.5 h-4.5 text-blue-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              CHAT CENTRAL DE PROCESSO (RAG)
            </span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {filterLabel ? (
              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full text-xs animate-fade-in">
                <span className="truncate max-w-[150px] sm:max-w-xs font-mono text-[11px]">{filterLabel}</span>
                <button
                  onClick={onResetFilters}
                  className="hover:text-slate-100 font-bold ml-1 text-[10px]"
                  title="Remover filtro"
                >
                  ✕
                </button>
              </div>
            ) : (
              <span className="hidden sm:inline text-[9px] text-slate-500 font-mono tracking-widest uppercase mr-1">
                CONSULTANDO TODOS OS CLIENTES
              </span>
            )}

            <button
              onClick={handleNewSession}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white hover:bg-blue-600/20 px-2.5 py-1.5 rounded-lg border border-blue-500/10 bg-blue-500/[0.02] transition-all cursor-pointer font-medium"
              title="Iniciar uma nova conversa do zero"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>Nova Conversa</span>
            </button>

            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white hover:bg-amber-600/20 px-2.5 py-1.5 rounded-lg border border-amber-500/10 bg-amber-500/[0.02] transition-all cursor-pointer font-medium"
              title="Acessar histórico de conversas anteriores"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Histórico</span>
            </button>

            <button
              onClick={handleClearCurrentChat}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 px-2.5 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] transition-all cursor-pointer font-medium"
              title="Limpar mensagens do chat atual"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Limpar Chat</span>
            </button>
          </div>
        </div>



        {/* Fluxo de Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#05070A]/50 z-10 relative">
          {messages.map((msg) => {
            const isAssistant = msg.sender === "assistant";
            
            return (
              <div key={msg.id} className={`flex ${isAssistant ? "justify-start" : "justify-end"} items-start gap-3 max-w-full`}>
                {isAssistant && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-[10px] font-black text-white shadow-[0_0_10px_rgba(37,99,235,0.35)] border border-blue-400/20 flex-shrink-0 mt-0.5" title="biti9 AI">
                    B9
                  </div>
                )}
                
                <div className={`max-w-2xl space-y-1.5 ${isAssistant ? "text-left" : "text-right"}`}>
                  {/* Balão */}
                  <div className={`p-4 rounded-2xl leading-relaxed text-xs border shadow-sm ${
                    isAssistant 
                      ? "bg-white/[0.02] border-white/5 rounded-tl-none text-slate-300" 
                      : "bg-[#1e3a8a]/45 border-blue-500/25 rounded-tr-none text-slate-100 shadow-md shadow-blue-950/10"
                  }`}>
                    {/* Retrocompatibilidade e suporte a múltiplos anexos */}
                    {((msg.attachment ? [msg.attachment] : []).concat(msg.attachments || [])).length > 0 && (
                      <div className="mb-2.5 flex flex-wrap gap-2">
                        {((msg.attachment ? [msg.attachment] : []).concat(msg.attachments || [])).map((att, attIdx) => (
                          <div key={attIdx} className="p-2 bg-black/25 rounded-xl border border-white/10 flex items-center gap-2.5 max-w-sm text-left backdrop-blur-sm">
                            {att.type.startsWith("image/") && att.base64 ? (
                              <img
                                src={`data:${att.type};base64,${att.base64}`}
                                alt={att.name}
                                className="w-12 h-12 object-cover rounded-lg border border-white/5 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 border border-blue-500/10 flex-shrink-0">
                                <FileText className="w-6 h-6" />
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-medium text-slate-200 truncate max-w-[180px]" title={att.name}>
                                {att.name}
                              </span>
                              <span className="text-[8px] text-slate-500 font-mono uppercase tracking-wider mt-0.5">
                                {att.name.split('.').pop()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {formatMarkdown(msg.text || "...")}
                  </div>

                  {/* Metadados / Tags da Mensagem */}
                  <div className={`text-[9px] text-slate-500 font-mono flex items-center gap-1.5 ${isAssistant ? "justify-start pl-1" : "justify-end pr-1"}`}>
                    <span>{msg.timestamp}</span>
                    {isAssistant && msg.id !== "welcome" && (
                      msg.isError ? (
                        <span className="text-rose-400 flex items-center gap-0.5 font-mono">
                          <XCircle className="w-3.5 h-3.5" />
                          RAG FALHOU
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-0.5 font-mono">
                          <CheckCircle className="w-3 h-3" />
                          RAG CONCLUÍDO
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && !isTyping && (
            <div className="flex items-start gap-3 max-w-xl animate-pulse">
              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-slate-400 shadow-sm flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="space-y-2 flex-1 pt-1">
                <div className="h-3 bg-white/5 rounded-full w-3/4"></div>
                <div className="h-3 bg-white/5 rounded-full w-5/6"></div>
                <div className="h-3 bg-white/5 rounded-full w-1/2"></div>
                <p className="text-[10px] text-blue-400 font-mono mt-2 flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                  <span>Consultando banco de vetores...</span>
                </p>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Caixa de Entrada e Chips Rápidos */}
        <div className="p-4 border-t border-white/5 bg-[#080B12] space-y-3.5 z-10 relative">
          {/* Alerta de nenhuma fonte ativa no painel lateral */}
          {selectedFileIds && selectedFileIds.length === 0 && (
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Nenhuma fonte ativa no painel lateral. Marque os arquivos que deseja consultar ou adicione novos no botão <strong>"+ Adicionar fontes"</strong>.</span>
            </div>
          )}
          {/* Chips de Perguntas Rápidas */}
          {messages.length <= 2 && !loading && !isTyping && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                Perguntas sugeridas (Clique para consultar)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-lg px-3 py-1.5 text-[11px] font-medium text-left transition-all flex items-center gap-1 max-w-full cursor-pointer"
                  >
                    <span className="truncate">{prompt}</span>
                    <ArrowRight className="w-3 h-3 flex-shrink-0 text-slate-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Card de Preview Flutuante de Arquivo */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2.5 p-2 bg-white/[0.04] border border-white/10 rounded-xl max-w-full w-fit shadow-lg backdrop-blur-md animate-fade-in">
                  {/* File Thumbnail or Icon */}
                  {file.type.startsWith("image/") ? (
                    <img
                      src={`data:${file.type};base64,${file.base64}`}
                      alt="Preview"
                      className="w-8 h-8 object-cover rounded-lg border border-white/10 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                  )}
                  
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[10.5px] font-medium text-slate-200 truncate max-w-[150px]" title={file.name}>
                      {file.name}
                    </span>
                    <span className="text-[8px] text-slate-500 uppercase font-mono tracking-wider">
                      {file.name.split('.').pop()}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== index))}
                    className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Remover anexo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Formulário de Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="relative flex items-center w-full"
          >
            {/* Input de Arquivo Escondido */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".png,.jpg,.jpeg,.pdf,.xlsx,.csv,.docx,.txt" 
              multiple
              className="hidden" 
            />

            {/* Botão de Clipe de Papel */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || isTyping}
              className="absolute left-1.5 p-2 text-slate-400 hover:text-slate-200 disabled:opacity-40 hover:bg-white/5 rounded-full transition-all flex items-center justify-center cursor-pointer"
              title="Anexar imagem ou documento (.png, .jpg, .pdf, .xlsx, .csv, .docx, .txt)"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Pergunte algo sobre os robôs (ex: 'Quais robôs o Cliente X possui?')..."
              disabled={loading || isTyping}
              className="w-full bg-[#05070A] border border-white/10 rounded-full py-2.5 pl-11 pr-12 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all disabled:opacity-50 font-sans"
            />
            <button
              type="submit"
              disabled={loading || isTyping || (!inputText.trim() && attachedFiles.length === 0)}
              className="absolute right-1.5 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-slate-600 text-white rounded-full transition-all flex items-center justify-center flex-shrink-0 cursor-pointer shadow-[0_0_8px_rgba(37,99,235,0.2)]"
              title="Enviar"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Overlay para Drag and Drop de Arquivos */}
        {isDragging && (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="absolute inset-0 bg-[#05070A]/95 backdrop-blur-sm border-2 border-dashed border-blue-500/40 rounded-2xl flex flex-col items-center justify-center gap-3 z-50 transition-all m-4"
          >
            <div className="w-16 h-16 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 animate-bounce">
              <Plus className="w-8 h-8" />
            </div>
            <span className="text-sm font-semibold text-slate-200">Arraste seu arquivo aqui</span>
            <span className="text-xs text-slate-500">Imagens (PNG, JPG) ou Documentos (PDF, XLSX, CSV, DOCX, TXT)</span>
          </div>
        )}


      </div>

      {/* GAVETA DE HISTÓRICO FLUTUANTE (DRAWER OVERLAY) */}
      {isHistoryOpen && (
        <div 
          id="history_drawer_overlay"
          className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity flex justify-end"
          onClick={() => setIsHistoryOpen(false)}
        >
          <div 
            id="history_drawer"
            className="w-full max-w-[380px] bg-[#0c101b] border-l border-white/10 h-full flex flex-col shadow-2xl relative animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho da Gaveta */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#080b13]">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-slate-100 font-sans">
                  Histórico de Conversas
                </h3>
                <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 font-bold">
                  {sessions.length}
                </span>
              </div>
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lista de Sessões */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
                  <MessageSquare className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs">Nenhum histórico de conversas encontrado</p>
                </div>
              ) : (
                sessions.map((sess) => {
                  const isActive = sess.id === activeSession.id;
                  const isEditing = editingSessionId === sess.id;
                  // Pegar primeira mensagem do usuário se existir para exibir como contexto
                  const firstUserMsg = sess.messages.find(m => m.sender === "user")?.text;
                  
                  return (
                    <div
                      key={sess.id}
                      onClick={() => {
                        if (!isEditing) {
                          setActiveSessionId(sess.id);
                          if (onSessionChange) onSessionChange(sess.id);
                          setExpandedSourceKey(null);
                          setIsHistoryOpen(false); // fecha ao carregar a conversa
                        }
                      }}
                      className={`group flex flex-col gap-2 p-3.5 rounded-xl border transition-all ${
                        isEditing
                          ? "border-blue-500/50 bg-blue-950/20"
                          : isActive
                          ? "bg-blue-600/15 border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.1)] cursor-pointer"
                          : "border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
                          
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                autoFocus
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleSaveRename(sess.id, e);
                                  } else if (e.key === "Escape") {
                                    setEditingSessionId(null);
                                  }
                                }}
                                onFocus={(e) => e.target.select()}
                                className="w-full bg-slate-900 border border-blue-500/50 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                              />
                              <button
                                type="button"
                                onClick={(e) => handleSaveRename(sess.id, e)}
                                className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors cursor-pointer flex-shrink-0"
                                title="Salvar título (Enter)"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSessionId(null);
                                }}
                                className="p-1 hover:bg-rose-500/20 text-rose-400 rounded transition-colors cursor-pointer flex-shrink-0"
                                title="Cancelar (Esc)"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col min-w-0">
                              <span className={`text-xs font-semibold truncate ${isActive ? "text-blue-200" : "text-slate-200 group-hover:text-white"}`}>
                                {sess.title}
                              </span>
                              {firstUserMsg && firstUserMsg !== sess.title && (
                                <p className="text-[11px] text-slate-400 truncate mt-0.5 italic">
                                  "{firstUserMsg}"
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleStartRename(e, sess)}
                              className="text-slate-500 hover:text-blue-400 p-1 rounded-md hover:bg-blue-500/10 transition-all cursor-pointer"
                              title="Renomear conversa"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(sess.id, e);
                              }}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded-md hover:bg-rose-500/10 transition-all cursor-pointer"
                              title="Excluir do histórico"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-600" />
                          <span>{sess.timestamp || "Hoje"}</span>
                        </div>
                        {isActive && (
                          <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider font-sans">
                            Ativo
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé da Gaveta */}
            <div className="p-4 border-t border-white/5 bg-[#080b13] flex gap-2">
              <button
                onClick={() => {
                  handleNewSession();
                  setIsHistoryOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all shadow-[0_0_12px_rgba(37,99,235,0.35)] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nova Conversa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
