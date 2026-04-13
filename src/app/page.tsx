"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ReactMarkdown from "react-markdown";

// ─── Types ────────────────────────────────────────────────────────────────────

type Card = {
  id: string;
  filename: string;
  column_id: string;
  created_at: string;
  updated_at: string;
};

type Column = {
  id: string;
  label: string;
  color: string;
  headerColor: string;
};

const COLUMNS: Column[] = [
  { id: "inbox", label: "Inbox", color: "bg-zinc-800/60", headerColor: "text-zinc-300 border-zinc-600" },
  { id: "ai-review", label: "AI Review", color: "bg-blue-950/40", headerColor: "text-blue-300 border-blue-700" },
  { id: "needs-attention", label: "Needs Attention", color: "bg-yellow-950/40", headerColor: "text-yellow-300 border-yellow-700" },
  { id: "ready-to-file", label: "Ready to File", color: "bg-green-950/40", headerColor: "text-green-300 border-green-700" },
  { id: "done", label: "Done", color: "bg-zinc-900/40", headerColor: "text-zinc-500 border-zinc-700" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripFrontmatter(md: string): string {
  if (!md.startsWith("---")) return md;
  const end = md.indexOf("---", 3);
  if (end === -1) return md;
  return md.slice(end + 3).trimStart();
}

function parseFrontmatterTags(md: string): string[] {
  if (!md.startsWith("---")) return [];
  const end = md.indexOf("---", 3);
  if (end === -1) return [];
  const fm = md.slice(3, end);
  const match = fm.match(/tags:\s*\n((?:\s+-\s+.+\n?)*)/);
  if (!match) {
    const inline = fm.match(/tags:\s*\[([^\]]+)\]/);
    if (inline) return inline[1].split(",").map((t) => t.trim());
    return [];
  }
  return match[1]
    .split("\n")
    .map((l) => l.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

// ─── Diff view ────────────────────────────────────────────────────────────────

function DiffView({ original, proposed }: { original: string; proposed: string }) {
  const leftLines = original.split("\n");
  const rightLines = proposed.split("\n");
  const maxLen = Math.max(leftLines.length, rightLines.length);

  return (
    <div className="flex gap-2 text-xs font-mono overflow-auto">
      <div className="flex-1 min-w-0">
        <div className="text-zinc-500 mb-1 font-sans text-[11px] uppercase tracking-wider">Original</div>
        {Array.from({ length: maxLen }).map((_, i) => {
          const line = leftLines[i] ?? "";
          const changed = line !== (rightLines[i] ?? "");
          return (
            <div
              key={i}
              className={`px-2 py-0.5 whitespace-pre-wrap break-all leading-5 ${
                changed ? "bg-red-950/60 text-red-200" : "text-zinc-400"
              }`}
            >
              {line || "\u00a0"}
            </div>
          );
        })}
      </div>
      <div className="w-px bg-zinc-700 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-zinc-500 mb-1 font-sans text-[11px] uppercase tracking-wider">Proposed</div>
        {Array.from({ length: maxLen }).map((_, i) => {
          const line = rightLines[i] ?? "";
          const changed = line !== (leftLines[i] ?? "");
          return (
            <div
              key={i}
              className={`px-2 py-0.5 whitespace-pre-wrap break-all leading-5 ${
                changed ? "bg-green-950/60 text-green-200" : "text-zinc-400"
              }`}
            >
              {line || "\u00a0"}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Move to Folder Modal ─────────────────────────────────────────────────────

function MoveFolderModal({
  cardId,
  onClose,
  onMoved,
}: {
  cardId: string;
  onClose: () => void;
  onMoved: () => void;
}) {
  const [folders, setFolders] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/vault/folders")
      .then((r) => r.json())
      .then((data) => setFolders(data));
  }, []);

  const filtered = folders.filter((f) =>
    f.toLowerCase().includes(query.toLowerCase())
  );

  async function handleMove() {
    if (!selected) return;
    setLoading(true);
    await fetch(`/api/cards/${encodeURIComponent(cardId)}/move-to-folder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetFolder: selected }),
    });
    onMoved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-[480px] max-h-[60vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-zinc-200 mb-3">Move to folder</h3>
        <input
          autoFocus
          type="text"
          placeholder="Filter folders..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500 mb-3"
        />
        <div className="flex-1 overflow-y-auto space-y-1">
          {filtered.map((f) => (
            <button
              key={f}
              onClick={() => setSelected(f)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
                selected === f
                  ? "bg-blue-700/50 text-blue-200"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              {f}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-zinc-600 text-sm px-3 py-2">No folders found</p>
          )}
        </div>
        <div className="flex gap-2 mt-4 pt-3 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={!selected || loading}
            className="flex-1 px-4 py-2 rounded-lg text-sm bg-blue-700 hover:bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Moving..." : "Move here"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Preview Panel ────────────────────────────────────────────────────────────

function PreviewPanel({
  card,
  onClose,
  onMoveToFolder,
  onRefresh,
}: {
  card: Card;
  onClose: () => void;
  onMoveToFolder: () => void;
  onRefresh: () => void;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [diff, setDiff] = useState<{ original: string; proposed: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const isNeedsAttention = card.column_id === "needs-attention";

  useEffect(() => {
    setLoading(true);
    setContent(null);
    setDiff(null);

    if (isNeedsAttention) {
      fetch(`/api/cards/${encodeURIComponent(card.id)}/ai-diff`)
        .then((r) => r.json())
        .then((data) => {
          if (data.original !== undefined) setDiff(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      fetch(`/api/cards/${encodeURIComponent(card.id)}/content`)
        .then((r) => r.json())
        .then((data) => {
          setContent(data.content ?? "");
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [card.id, card.column_id, isNeedsAttention]);

  async function handleAccept() {
    setActing(true);
    await fetch(`/api/cards/${encodeURIComponent(card.id)}/accept`, { method: "POST" });
    onRefresh();
    onClose();
  }

  async function handleReject() {
    setActing(true);
    await fetch(`/api/cards/${encodeURIComponent(card.id)}/reject`, { method: "POST" });
    onRefresh();
    onClose();
  }

  const tags = content ? parseFrontmatterTags(content) : [];
  const body = content ? stripFrontmatter(content) : "";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-zinc-200 truncate">
            {card.filename.replace(".md", "")}
          </h2>
          <p className="text-xs text-zinc-600 mt-0.5">{card.id}</p>
        </div>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          {isNeedsAttention && (
            <>
              <button
                onClick={handleAccept}
                disabled={acting}
                className="px-3 py-1.5 text-xs bg-green-700 hover:bg-green-600 text-white rounded-lg disabled:opacity-40 transition-colors"
              >
                Accept
              </button>
              <button
                onClick={handleReject}
                disabled={acting}
                className="px-3 py-1.5 text-xs bg-red-900 hover:bg-red-800 text-red-200 rounded-lg disabled:opacity-40 transition-colors"
              >
                Reject
              </button>
            </>
          )}
          <button
            onClick={onMoveToFolder}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Move to folder
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading && (
          <div className="text-zinc-600 text-sm animate-pulse">Loading...</div>
        )}

        {!loading && isNeedsAttention && diff && (
          <DiffView original={diff.original} proposed={diff.proposed} />
        )}

        {!loading && isNeedsAttention && !diff && (
          <p className="text-zinc-600 text-sm">No diff available.</p>
        )}

        {!loading && !isNeedsAttention && content !== null && (
          <>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 text-xs bg-zinc-800 text-zinc-400 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="prose prose-sm prose-invert max-w-none text-zinc-300 leading-relaxed">
              <ReactMarkdown>{body}</ReactMarkdown>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Card Component ───────────────────────────────────────────────────────────

function CardItem({
  card,
  onClick,
  onRefresh,
}: {
  card: Card;
  onClick: () => void;
  onRefresh: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const [menuOpen, setMenuOpen] = useState(false);
  const [moveFolderOpen, setMoveFolderOpen] = useState(false);
  const [snippet, setSnippet] = useState<string>("");

  useEffect(() => {
    fetch(`/api/cards/${encodeURIComponent(card.id)}/content`)
      .then((r) => r.json())
      .then((data) => {
        const body = stripFrontmatter(data.content ?? "");
        setSnippet(body.trim().slice(0, 120));
      })
      .catch(() => {});
  }, [card.id]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isAiReview = card.column_id === "ai-review";

  async function handleMarkDone() {
    await fetch(`/api/cards/${encodeURIComponent(card.id)}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column_id: "done" }),
    });
    onRefresh();
  }

  return (
    <>
      {moveFolderOpen && (
        <MoveFolderModal
          cardId={card.id}
          onClose={() => setMoveFolderOpen(false)}
          onMoved={onRefresh}
        />
      )}
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={onClick}
        className="bg-zinc-900 border border-zinc-700/60 rounded-xl p-3.5 cursor-pointer hover:border-zinc-500 transition-colors group relative select-none"
      >
        {/* Spinner for AI Review */}
        {isAiReview && (
          <span className="absolute top-3 right-3 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        )}

        {/* Title */}
        <p className="text-sm font-medium text-zinc-200 leading-snug pr-7">
          {card.filename.replace(".md", "")}
        </p>

        {/* Menu button */}
        {!isAiReview && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300 w-6 h-6 flex items-center justify-center rounded text-base"
          >
            ⋮
          </button>
        )}

        {/* Snippet */}
        {snippet && (
          <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed line-clamp-2">
            {snippet}
          </p>
        )}

        {/* Date */}
        <p className="text-[11px] text-zinc-700 mt-2">
          {new Date(card.updated_at + "Z").toLocaleDateString()}
        </p>

        {/* Dropdown menu */}
        {menuOpen && (
          <div
            className="absolute top-8 right-3 z-20 bg-zinc-800 border border-zinc-700 rounded-lg py-1 shadow-xl min-w-[160px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setMenuOpen(false);
                setMoveFolderOpen(true);
              }}
              className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Move to folder
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                handleMarkDone();
              }}
              className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Mark done
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Column Component ─────────────────────────────────────────────────────────

function KanbanColumn({
  column,
  cards,
  onCardClick,
  onRefresh,
}: {
  column: Column;
  cards: Card[];
  onCardClick: (card: Card) => void;
  onRefresh: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col w-64 flex-shrink-0">
      {/* Column header */}
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${column.headerColor}`}>
        <h3 className="text-xs font-semibold uppercase tracking-wider">
          {column.label}
        </h3>
        <span className="ml-auto text-xs opacity-50">{cards.length}</span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-32 rounded-xl transition-colors ${column.color} ${
          isOver ? "ring-2 ring-blue-500/50" : ""
        } p-2 space-y-2`}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
              onRefresh={onRefresh}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="text-center text-zinc-700 text-xs py-6">Empty</div>
        )}
      </div>
    </div>
  );
}

// ─── Board Page ───────────────────────────────────────────────────────────────

export default function BoardPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [previewCard, setPreviewCard] = useState<Card | null>(null);
  const [moveFolderCardId, setMoveFolderCardId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchCards = useCallback(async () => {
    const res = await fetch("/api/cards");
    const data = await res.json();
    setCards(data);
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSync() {
    setSyncing(true);
    const res = await fetch("/api/cards", { method: "POST" });
    const data = await res.json();
    await fetchCards();
    setSyncing(false);
    showToast(`Synced — ${data.added} added, ${data.removed} removed`);
  }

  function handleDragStart(event: DragStartEvent) {
    const card = cards.find((c) => c.id === event.active.id);
    if (card) setActiveCard(card);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const card = cards.find((c) => c.id === active.id);
    if (!card) return;

    // Determine target column — could be dropped on a card or directly on the column
    const overCard = cards.find((c) => c.id === over.id);
    const targetColumn = overCard ? overCard.column_id : (over.id as string);

    if (card.column_id === targetColumn) return;

    // Optimistic update
    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, column_id: targetColumn } : c))
    );

    await fetch(`/api/cards/${encodeURIComponent(card.id)}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column_id: targetColumn }),
    });

    // Auto-trigger AI review when dropped into ai-review column
    if (targetColumn === "ai-review") {
      const res = await fetch(`/api/cards/${encodeURIComponent(card.id)}/ai-review`, {
        method: "POST",
      });
      if (!res.ok) {
        showToast("AI review failed — card moved back to inbox");
      } else {
        showToast("AI review complete — check Needs Attention");
      }
      await fetchCards();
    }
  }

  const columnCards = (colId: string) => cards.filter((c) => c.column_id === colId);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-950 flex-shrink-0">
        <span className="text-sm font-semibold text-zinc-200">Obsidian Board</span>
        <div className="flex-1" />
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Sync"}
        </button>
        <Link
          href="/settings"
          className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          Settings
        </Link>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-5">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 h-full">
              {COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  cards={columnCards(col.id)}
                  onCardClick={(card) => setPreviewCard(card)}
                  onRefresh={fetchCards}
                />
              ))}
            </div>
            <DragOverlay>
              {activeCard && (
                <div className="bg-zinc-900 border border-zinc-500 rounded-xl p-3.5 w-64 opacity-90 shadow-2xl">
                  <p className="text-sm font-medium text-zinc-200">
                    {activeCard.filename.replace(".md", "")}
                  </p>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Preview panel */}
        {previewCard && (
          <div className="w-[42%] flex-shrink-0 border-l border-zinc-800 bg-zinc-950 overflow-hidden flex flex-col">
            <PreviewPanel
              card={previewCard}
              onClose={() => setPreviewCard(null)}
              onMoveToFolder={() => setMoveFolderCardId(previewCard.id)}
              onRefresh={fetchCards}
            />
          </div>
        )}
      </div>

      {/* Move to folder modal triggered from preview panel */}
      {moveFolderCardId && (
        <MoveFolderModal
          cardId={moveFolderCardId}
          onClose={() => setMoveFolderCardId(null)}
          onMoved={() => {
            setPreviewCard(null);
            setMoveFolderCardId(null);
            fetchCards();
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs px-4 py-2.5 rounded-xl shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
