import React, { useState, useEffect, useRef } from "react";
import { Layers, Database, RefreshCw, ShieldCheck, User, LogOut, ArrowRight, Sparkles } from "lucide-react";
import ChatPanel from "./components/ChatPanel";
import SourcesPanel from "./components/SourcesPanel";
import { ClientGroup } from "./types";

export default function App() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSources, setShowSources] = useState(true);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [dbStatus, setDbStatus] = useState({
    mode: "demo" as "real" | "demo",
    rootFolderId: "",
    rootFolderName: "",
    fileCount: 0,
    chunkCount: 0,
    clientGroups: [] as ClientGroup[]
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return localStorage.getItem("biti9_active_session_id") || "default_session";
  });

  const userEmail = "gabriel.conceicao@biti9.com.br";
  const abortControllerRef = useRef<AbortController | null>(null);

  // Filtros selecionados no Sidebar
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedRobotId, setSelectedRobotId] = useState("");

  // Carrega status e arquivos do Banco de Vetores para a conversa ativa
  const loadDbStatus = async (targetSessionId?: string) => {
    const sessId = targetSessionId || activeSessionId;

    // Cancela requisição anterior se houver para evitar sobrescrever com dados antigos
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 1. Reset imediato de estado para feedback visual instantâneo na UI
    setDbStatus(prev => ({
      ...prev,
      clientGroups: [],
      fileCount: 0,
      chunkCount: 0
    }));
    setSelectedFileIds([]);
    setLoading(true);

    try {
      const emailParam = `?email=${encodeURIComponent(userEmail)}`;
      const res = await fetch(`/api/conversations/${encodeURIComponent(sessId)}/sources${emailParam}`, {
        signal: controller.signal
      });

      if (res.ok) {
        const data = await res.json();
        // Apenas atualiza se este ainda for o controller ativo mais recente
        if (abortControllerRef.current === controller) {
          setDbStatus({
            mode: data.mode || "demo",
            rootFolderId: data.rootFolderId || "",
            rootFolderName: data.rootFolderName || "",
            fileCount: data.fileCount || 0,
            chunkCount: data.chunkCount || 0,
            clientGroups: data.clientGroups || []
          });
        }
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        // Ignorar requisições abortadas ao alternar rapidamente entre conversas
        return;
      }
      console.error("Erro ao carregar dados do banco de dados", e);
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDbStatus(activeSessionId);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [activeSessionId]);

  const handleSessionChange = (newSessionId: string) => {
    // Reset imediato antes de qualquer requisição
    setDbStatus(prev => ({
      ...prev,
      clientGroups: [],
      fileCount: 0,
      chunkCount: 0
    }));
    setSelectedFileIds([]);
    setActiveSessionId(newSessionId);
    localStorage.setItem("biti9_active_session_id", newSessionId);
    loadDbStatus(newSessionId);
  };

  // Sincroniza selectedFileIds para marcar novas fontes por padrão ao subir ou carregar e limpar deletados
  useEffect(() => {
    const allFileIds: string[] = [];
    dbStatus.clientGroups.forEach(client => {
      client.robots.forEach(robot => {
        robot.documents.forEach(doc => {
          allFileIds.push(doc.id);
        });
      });
    });

    setSelectedFileIds(prev => {
      // 1. Filtra IDs que não existem mais no sistema (arquivos excluídos)
      let nextSelection = prev.filter(id => allFileIds.includes(id));
      let changed = nextSelection.length !== prev.length;

      // 2. Adiciona novos por padrão (novas sincronizações ou uploads)
      allFileIds.forEach(id => {
        if (!nextSelection.includes(id)) {
          nextSelection.push(id);
          changed = true;
        }
      });

      return changed ? nextSelection : prev;
    });
  }, [dbStatus.clientGroups]);

  const handleSelectFilter = (clientId: string, robotId: string) => {
    setSelectedClientId(clientId);
    setSelectedRobotId(robotId);
  };

  const handleResetFilters = () => {
    setSelectedClientId("");
    setSelectedRobotId("");
  };

  const handleToggleFile = (fileId: string) => {
    setSelectedFileIds(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      const allFileIds: string[] = [];
      dbStatus.clientGroups.forEach(client => {
        client.robots.forEach(robot => {
          robot.documents.forEach(doc => {
            allFileIds.push(doc.id);
          });
        });
      });
      setSelectedFileIds(allFileIds);
    } else {
      setSelectedFileIds([]);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#05070A] font-sans overflow-hidden text-slate-300">
      
      {/* Top Header Barra de Navegação */}
      <header className="bg-[#080B12] border-b border-white/5 flex-shrink-0 h-16 flex items-center justify-between px-4 lg:px-6 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white shadow-[0_0_15px_rgba(37,99,235,0.45)]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold uppercase tracking-wider text-white">biti9</h1>
              <span className="text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono">
                RAG MULTI-PDD
              </span>
            </div>
            <p className="text-[10px] text-blue-400 font-mono uppercase">Neural Indexing Engine Active</p>
          </div>
        </div>

        {/* Corporate Status Badge */}
        <div className="hidden md:flex items-center gap-2 text-slate-500 font-mono text-[10px] bg-white/[0.02] border border-white/5 px-3 py-1 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>PAINEL INTEGRADO CENTRALIZADO</span>
        </div>

        {/* Toggle para o Painel de Fontes */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSources(prev => !prev)}
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              showSources 
                ? "bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20" 
                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{showSources ? "Ocultar Fontes" : "Mostrar Fontes"}</span>
          </button>
        </div>

      </header>

      {/* Área Principal de Conteúdo */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Esquerda: Painel de Fontes de Consulta (Sidebar) */}
        {showSources && (
          <SourcesPanel
            clientGroups={dbStatus.clientGroups}
            selectedFileIds={selectedFileIds}
            onToggleFile={handleToggleFile}
            onToggleAll={handleToggleAll}
            onRefresh={() => loadDbStatus(activeSessionId)}
            userEmail={userEmail}
            activeSessionId={activeSessionId}
            loading={loading}
          />
        )}

        {/* Centro/Direita: Chat de Conversa */}
        <main className="flex-1 flex flex-col min-h-0 bg-[#05070A]">
          <ChatPanel
            selectedClientId={selectedClientId}
            selectedRobotId={selectedRobotId}
            clientGroups={dbStatus.clientGroups}
            onResetFilters={handleResetFilters}
            userEmail={userEmail}
            token="unauthenticated-public-drive-flow"
            onRefresh={() => loadDbStatus(activeSessionId)}
            selectedFileIds={selectedFileIds}
            activeSessionId={activeSessionId}
            onSessionChange={handleSessionChange}
          />
        </main>
      </div>
    </div>
  );
}
