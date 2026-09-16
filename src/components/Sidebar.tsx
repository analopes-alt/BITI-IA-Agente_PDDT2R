import React, { useState, useEffect } from "react";
import { Folder, Cpu, FileText, Search, Database, RefreshCw, Layers, Eye, EyeOff } from "lucide-react";
import { ClientGroup, PDDDocument } from "../types";

interface SidebarProps {
  clientGroups: ClientGroup[];
  selectedClientId: string;
  selectedRobotId: string;
  onSelectFilter: (clientId: string, robotId: string) => void;
  onResetFilters: () => void;
  fileCount: number;
  chunkCount: number;
  mode: "real" | "demo";
  loading: boolean;
  onRefresh: () => void;
  activeTab?: string;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  clientGroups,
  selectedClientId,
  selectedRobotId,
  onSelectFilter,
  onResetFilters,
  fileCount,
  chunkCount,
  mode,
  loading,
  onRefresh,
  activeTab = "chat",
  mobileOpen = false,
  onCloseMobile
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showListInChat, setShowListInChat] = useState(false);
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({
    "demo_client_Cliente_A_(Banco_Global)": true,
    "demo_client_Cliente_B_(Varejo_Total)": true
  });
  const [expandedRobots, setExpandedRobots] = useState<Record<string, boolean>>({});

  // Reset show list state when switching tabs
  useEffect(() => {
    if (activeTab === "chat") {
      setShowListInChat(false);
    }
  }, [activeTab]);

  const toggleClient = (id: string) => {
    setExpandedClients(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleRobot = (id: string) => {
    setExpandedRobots(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtra os grupos de clientes com base no texto de busca
  const filteredGroups = clientGroups.map(client => {
    const matchedRobots = client.robots.map(robot => {
      const matchedDocs = robot.documents.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      const isRobotMatch = robot.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (isRobotMatch || matchedDocs.length > 0) {
        return {
          ...robot,
          documents: matchedDocs.length > 0 ? matchedDocs : robot.documents
        };
      }
      return null;
    }).filter(Boolean) as any[];

    const isClientMatch = client.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (isClientMatch || matchedRobots.length > 0) {
      return {
        ...client,
        robots: matchedRobots.length > 0 ? matchedRobots : client.robots
      };
    }
    return null;
  }).filter(Boolean) as ClientGroup[];

  const isFilterActive = selectedClientId || selectedRobotId;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      
      <div 
        id="sidebar_container" 
        className={`fixed inset-y-0 left-0 z-40 w-80 bg-[#080B12] border-r border-white/5 flex flex-col h-full text-slate-300 transition-transform duration-300 transform lg:translate-x-0 lg:static ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Botão de Fechar no Mobile se necessário */}
        {mobileOpen && onCloseMobile && (
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#080B12] lg:hidden">
            <span className="text-xs font-mono text-slate-400">FILTROS DE BUSCA</span>
            <button
              onClick={onCloseMobile}
              className="p-1 hover:bg-white/5 rounded-md text-slate-400 hover:text-slate-200 transition-colors text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

      {activeTab === "chat" && !showListInChat ? (
        <div className="flex-1 p-6 text-center flex flex-col justify-center items-center space-y-4">
          <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
            <Layers className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Interface Focada</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed max-w-[200px]">
              Ocultamos a busca e a lista de robôs para garantir 100% de foco na conversa do Chat Central.
            </p>
          </div>
          <button
            onClick={() => setShowListInChat(true)}
            className="flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 text-[10px] font-bold py-1.5 px-3.5 rounded-lg transition-all uppercase tracking-wider cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Exibir Filtros</span>
          </button>
        </div>
      ) : (
        <>
          {activeTab === "chat" && (
            <div className="p-2.5 bg-blue-950/10 border-b border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider pl-1 flex items-center gap-1">
                <Layers className="w-3 h-3 animate-pulse" />
                Modo Filtros Ativo
              </span>
              <button
                onClick={() => setShowListInChat(false)}
                className="flex items-center gap-1 text-[9px] text-slate-500 hover:text-slate-300 font-bold bg-white/5 px-2 py-1 rounded transition-colors cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Ocultar</span>
              </button>
            </div>
          )}

          {/* Busca */}
          <div className="p-3 border-b border-white/5 bg-[#080B12]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar PDD ou robô..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Árvore de Clientes e Robôs */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between items-center">
          <span>Clientes & Robôs</span>
          {isFilterActive && (
            <button 
              onClick={onResetFilters} 
              className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-medium lowercase bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {filteredGroups.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            {searchQuery ? "Nenhum resultado encontrado." : "Sincronize arquivos para ver os clientes."}
          </div>
        ) : (
          filteredGroups.map(client => {
            const isClientExpanded = !!expandedClients[client.id];
            const isClientSelected = selectedClientId === client.id && !selectedRobotId;

            return (
              <div key={client.id} className="space-y-0.5">
                {/* Cabeçalho do Cliente */}
                <div 
                  onClick={() => {
                    onSelectFilter(client.id, "");
                    toggleClient(client.id);
                  }}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors group ${
                    isClientSelected 
                      ? "bg-blue-600/10 text-blue-400 font-medium border border-blue-500/20" 
                      : selectedClientId === client.id 
                        ? "text-blue-400 bg-white/5"
                        : "hover:bg-white/5 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Folder className={`w-4 h-4 flex-shrink-0 ${isClientSelected ? "text-blue-500" : "text-slate-400 group-hover:text-slate-300"}`} />
                    <span className="truncate text-sm">{client.name}</span>
                  </div>
                  <span className="text-[10px] font-semibold bg-white/5 text-slate-400 px-1.5 py-0.5 rounded-full font-mono">
                    {client.robots.length}
                  </span>
                </div>

                {/* Sublista de Robôs */}
                {isClientExpanded && (
                  <div className="pl-4 border-l border-white/5 ml-4 space-y-0.5 mt-0.5">
                    {client.robots.map(robot => {
                      const isRobotExpanded = !!expandedRobots[robot.id];
                      const isRobotSelected = selectedRobotId === robot.id;

                      return (
                        <div key={robot.id} className="space-y-0.5">
                          {/* Cabeçalho do Robô */}
                          <div
                            onClick={() => {
                              onSelectFilter(client.id, robot.id);
                              toggleRobot(robot.id);
                            }}
                            className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer transition-colors group text-xs ${
                              isRobotSelected 
                                ? "bg-blue-600/15 text-blue-300 font-medium border border-blue-500/25" 
                                : "hover:bg-white/5 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Cpu className={`w-3.5 h-3.5 flex-shrink-0 ${isRobotSelected ? "text-blue-500" : "text-slate-500 group-hover:text-slate-400"}`} />
                              <span className="truncate">{robot.name}</span>
                            </div>
                            <span className="text-[9px] bg-white/5 text-slate-500 px-1 rounded-full font-mono">
                              {robot.documents.length}
                            </span>
                          </div>

                          {/* Arquivos do Robô */}
                          {(isRobotExpanded || isRobotSelected) && (
                            <div className="pl-3 border-l border-white/5 ml-3 space-y-0.5 mt-0.5">
                              {robot.documents.map(doc => (
                                <div
                                  key={doc.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectFilter(client.id, robot.id);
                                  }}
                                  className="flex items-center gap-1.5 p-1 rounded hover:bg-white/5 text-slate-500 hover:text-slate-300 cursor-pointer text-[11px] transition-colors"
                                  title={`Modificado: ${new Date(doc.modifiedTime).toLocaleDateString()}`}
                                >
                                  <FileText className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                  <span className="truncate flex-1">{doc.name}</span>
                                  {doc.chunkCount && (
                                    <span className="text-[9px] text-blue-400 bg-blue-950/40 border border-blue-900/40 px-1 rounded font-mono">
                                      {doc.chunkCount}f
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  )}

      {/* Footer corporativo sutil */}
      <div className="p-3 bg-[#05070A] border-t border-white/5 text-center flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-mono">
        <Layers className="w-3 h-3 text-blue-500" />
        <span>biti9 RAG ENGINE v1.2</span>
      </div>
    </div>
  </>
  );
}
