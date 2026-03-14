'use client';

/**
 * FriendNetwork — React Flow graph with inline double-click editing
 *
 * Install:  npm install @xyflow/react
 * CSS:      import '@xyflow/react/dist/style.css'; // in root layout
 * Usage:    import FriendNetwork from '@/components/FriendNetwork';
 */

import { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Panel,
  Handle,
  Position,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ─── Palette ─────────────────────────────────────────────────────────────────
const PALETTE = [
  { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },
  { bg: '#dcfce7', border: '#22c55e', text: '#15803d' },
  { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c' },
  { bg: '#fde68a', border: '#f59e0b', text: '#92400e' },
  { bg: '#ede9fe', border: '#8b5cf6', text: '#6d28d9' },
  { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' },
  { bg: '#ccfbf1', border: '#14b8a6', text: '#0f766e' },
  { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },
];
let colorCursor = 0;
const pickColor = () => PALETTE[colorCursor++ % PALETTE.length];

let uid = 10;
const nextId = () => String(uid++);

const RELATIONSHIP_TYPES = ['เพื่อนสนิท', 'รู้จักกัน', 'เพื่อนร่วมงาน', 'ครอบครัว', 'เพื่อนเรียน', 'อื่นๆ'];

const handleStyle = {
  width: 10, height: 10,
  background: '#94a3b8', border: '2px solid white',
  opacity: 0, transition: 'opacity 0.2s',
};

// ─── Inline text input used inside node/edge ──────────────────────────────────
function InlineInput({ value, onCommit, onCancel, style = {} }) {
  const [text, setText] = useState(value);
  const ref = useRef(null);

  return (
    <input
      ref={ref}
      autoFocus
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text.trim() ? onCommit(text.trim()) : onCancel()}
      onKeyDown={(e) => {
        e.stopPropagation(); // prevent ReactFlow from eating keys
        if (e.key === 'Enter' && text.trim()) onCommit(text.trim());
        if (e.key === 'Escape') onCancel();
      }}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      style={{
        border: '1.5px solid #3b82f6',
        borderRadius: 8,
        outline: 'none',
        fontFamily: 'inherit',
        background: 'white',
        color: '#111',
        boxShadow: '0 0 0 3px #3b82f620',
        ...style,
      }}
    />
  );
}

// ─── Custom Person Node ───────────────────────────────────────────────────────
function PersonNode({ id, data, selected }) {
  const { label, color, degree = 0, onRename } = data;
  const [editing, setEditing] = useState(false);

  const size = Math.max(52, Math.min(80, 52 + degree * 4));
  const initials = label.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setEditing(true);
  };

  const commit = (val) => {
    onRename(id, val);
    setEditing(false);
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, userSelect: 'none' }}
      onDoubleClick={handleDoubleClick}
    >
      {[Position.Top, Position.Bottom, Position.Left, Position.Right].map((pos) => (
        <span key={pos}>
          <Handle type="source" position={pos} style={handleStyle} />
          <Handle type="target" position={pos} style={handleStyle} />
        </span>
      ))}

      {/* Avatar circle */}
      <div style={{
        position: 'relative',
        width: size, height: size, borderRadius: '50%',
        background: color.bg,
        border: `2.5px solid ${selected ? color.border : color.border + '88'}`,
        boxShadow: selected ? `0 0 0 4px ${color.border}33` : '0 2px 8px rgba(0,0,0,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.max(14, size * 0.28), fontWeight: 700, color: color.text,
        transition: 'all 0.15s', cursor: 'grab',
      }}>
        {initials}
        {degree > 0 && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            background: color.border, color: 'white',
            borderRadius: '50%', width: 18, height: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, border: '2px solid white',
          }}>
            {degree}
          </div>
        )}
      </div>

      {/* Name label — shows input when editing */}
      {editing ? (
        <InlineInput
          value={label}
          onCommit={commit}
          onCancel={() => setEditing(false)}
          style={{ width: 100, padding: '3px 8px', fontSize: 12, textAlign: 'center' }}
        />
      ) : (
        <div
          title="ดับเบิ้ลคลิกเพื่อแก้ไขชื่อ"
          style={{
            background: editing ? 'transparent' : 'white',
            border: `1px solid ${color.border}55`,
            borderRadius: 20, padding: '2px 10px',
            fontSize: 12, fontWeight: 600, color: color.text,
            whiteSpace: 'nowrap', maxWidth: 120,
            overflow: 'hidden', textOverflow: 'ellipsis',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            cursor: 'text',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

// ─── Custom Relationship Edge ─────────────────────────────────────────────────
function RelationshipEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data, selected, markerEnd,
}) {
  const [editing, setEditing] = useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  const commit = (val) => {
    data?.onRenameEdge?.(id, val);
    setEditing(false);
  };

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={{
        stroke: selected ? '#3b82f6' : '#94a3b8',
        strokeWidth: selected ? 2.5 : 1.5,
        transition: 'stroke 0.15s, stroke-width 0.15s',
      }} />

      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            zIndex: 10,
          }}
          onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
        >
          {editing ? (
            <InlineInput
              value={data?.label ?? ''}
              onCommit={commit}
              onCancel={() => setEditing(false)}
              style={{ width: 110, padding: '2px 8px', fontSize: 11, textAlign: 'center' }}
            />
          ) : (
            <div
              title="ดับเบิ้ลคลิกเพื่อแก้ไขความสัมพันธ์"
              style={{
                background: selected ? '#eff6ff' : 'white',
                border: `1px solid ${selected ? '#3b82f6' : '#e2e8f0'}`,
                borderRadius: 12, padding: '3px 10px',
                fontSize: 11, fontWeight: 500,
                color: selected ? '#1d4ed8' : '#64748b',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                transition: 'all 0.15s',
                cursor: 'text',
                minWidth: 40, textAlign: 'center',
              }}
            >
              {data?.label || <span style={{ opacity: 0.4 }}>—</span>}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

// ─── Seed data ────────────────────────────────────────────────────────────────
const seedNodes = [
  { id: '1', type: 'person', position: { x: 200, y: 180 }, data: { label: 'อลิส',   color: PALETTE[0] } },
  { id: '2', type: 'person', position: { x: 420, y: 80  }, data: { label: 'บ็อบ',    color: PALETTE[1] } },
  { id: '3', type: 'person', position: { x: 560, y: 280 }, data: { label: 'ชาร์ลี', color: PALETTE[2] } },
  { id: '4', type: 'person', position: { x: 340, y: 400 }, data: { label: 'เดน่า',   color: PALETTE[3] } },
  { id: '5', type: 'person', position: { x: 80,  y: 350 }, data: { label: 'อีวาน',   color: PALETTE[4] } },
];
const seedEdges = [
  { id: 'e1-2', source: '1', target: '2', type: 'relationship', data: { label: 'เพื่อนสนิท' } },
  { id: 'e1-3', source: '1', target: '3', type: 'relationship', data: { label: 'รู้จักกัน' } },
  { id: 'e2-3', source: '2', target: '3', type: 'relationship', data: { label: 'เพื่อนร่วมงาน' } },
  { id: 'e3-4', source: '3', target: '4', type: 'relationship', data: { label: 'เพื่อนสนิท' } },
  { id: 'e1-4', source: '1', target: '4', type: 'relationship', data: { label: 'เพื่อนสนิท' } },
  { id: 'e4-5', source: '4', target: '5', type: 'relationship', data: { label: 'รู้จักกัน' } },
  { id: 'e1-5', source: '1', target: '5', type: 'relationship', data: { label: 'เพื่อนร่วมงาน' } },
];

function withDegrees(nodes, edges) {
  return nodes.map((n) => ({
    ...n,
    data: { ...n.data, degree: edges.filter((e) => e.source === n.id || e.target === n.id).length },
  }));
}

// ─── Modal primitives ─────────────────────────────────────────────────────────
function Modal({ title, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: 14, padding: '20px 24px', width: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#111' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}
function ModalActions({ onCancel, onConfirm, confirmLabel = 'ตกลง', disabled }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
      <button onClick={onCancel} style={{ padding: '7px 18px', fontSize: 13, borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', cursor: 'pointer' }}>ยกเลิก</button>
      <button onClick={onConfirm} disabled={disabled} style={{ padding: '7px 18px', fontSize: 13, borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: disabled ? 0.5 : 1 }}>{confirmLabel}</button>
    </div>
  );
}

function AddPersonModal({ onConfirm, onCancel }) {
  const [name, setName] = useState('');
  return (
    <Modal title="เพิ่มบุคคลใหม่">
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onConfirm(name.trim()); if (e.key === 'Escape') onCancel(); }}
        placeholder="ชื่อบุคคล..."
        style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box', color: '#111' }}
      />
      <ModalActions onCancel={onCancel} onConfirm={() => name.trim() && onConfirm(name.trim())} confirmLabel="เพิ่ม" disabled={!name.trim()} />
    </Modal>
  );
}

function AddEdgeModal({ onConfirm, onCancel }) {
  const [type, setType] = useState(RELATIONSHIP_TYPES[0]);
  const [custom, setCustom] = useState('');
  const isCustom = type === 'อื่นๆ';
  const label = isCustom ? custom : type;
  return (
    <Modal title="ระบุความสัมพันธ์">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: isCustom ? 12 : 0 }}>
        {RELATIONSHIP_TYPES.map((r) => (
          <button key={r} onClick={() => setType(r)} style={{
            fontSize: 12, padding: '4px 12px', borderRadius: 20,
            border: `1px solid ${type === r ? '#3b82f6' : '#e2e8f0'}`,
            background: type === r ? '#dbeafe' : 'white',
            color: type === r ? '#1d4ed8' : '#64748b',
            cursor: 'pointer', fontWeight: type === r ? 600 : 400,
          }}>{r}</button>
        ))}
      </div>
      {isCustom && (
        <input autoFocus value={custom} onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && label) onConfirm(label); if (e.key === 'Escape') onCancel(); }}
          placeholder="ระบุความสัมพันธ์..."
          style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box', marginTop: 4 }}
        />
      )}
      <ModalActions onCancel={onCancel} onConfirm={() => label && onConfirm(label)} confirmLabel="เชื่อม" disabled={!label} />
    </Modal>
  );
}

const toolBtn = (bg, color, border) => ({
  fontSize: 12, padding: '5px 12px', borderRadius: 20,
  border: `1px solid ${border}`, background: bg, color,
  cursor: 'pointer', fontWeight: 500,
});

// ─── Node & edge type maps (defined outside component to avoid remounts) ──────
const nodeTypes = { person: PersonNode };
const edgeTypes = { relationship: RelationshipEdge };

// ─── Main component ───────────────────────────────────────────────────────────
function FriendNetworkInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [modal, setModal] = useState(null);
  const [pendingEdge, setPendingEdge] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const hasSelection = nodes.some((n) => n.selected) || edges.some((e) => e.selected);

  // ── callback refs so handlers always see fresh state ──────────────────────
  const setNodesRef = useRef(setNodes);
  setNodesRef.current = setNodes;
  const setEdgesRef = useRef(setEdges);
  setEdgesRef.current = setEdges;

  // ── rename node (called from PersonNode via data.onRename) ─────────────────
  const onRenameNode = useCallback((nodeId, newLabel) => {
    setNodesRef.current((nds) =>
      nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n)
    );
  }, []);

  // ── rename edge label (called from RelationshipEdge via data.onRenameEdge) ──
  const onRenameEdge = useCallback((edgeId, newLabel) => {
    setEdgesRef.current((eds) =>
      eds.map((e) => e.id === edgeId ? { ...e, data: { ...e.data, label: newLabel } } : e)
    );
  }, []);

  // ── inject callbacks + degree into node data ───────────────────────────────
  const enrichNodes = useCallback((rawNodes, rawEdges) =>
    rawNodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        degree: rawEdges.filter((e) => e.source === n.id || e.target === n.id).length,
        onRename: onRenameNode,
      },
    })), [onRenameNode]);

  // ── inject onRenameEdge callback into every edge ───────────────────────────
  const enrichEdges = useCallback((rawEdges) =>
    rawEdges.map((e) => ({
      ...e,
      data: { ...e.data, onRenameEdge },
    })), [onRenameEdge]);

  // ── initialise with seed data ──────────────────────────────────────────────
  const initialised = useRef(false);
  if (!initialised.current) {
    initialised.current = true;
    const richEdges = enrichEdges(seedEdges);
    const richNodes = enrichNodes(seedNodes, richEdges);
    // directly mutate the initial state arrays before first render
    nodes.length = 0; nodes.push(...richNodes);
    edges.length = 0; edges.push(...richEdges);
  }

  const refreshDegrees = useCallback((nextEdges) => {
    setNodesRef.current((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          degree: nextEdges.filter((e) => e.source === n.id || e.target === n.id).length,
          onRename: onRenameNode,
        },
      }))
    );
  }, [onRenameNode]);

  const onConnect = useCallback((params) => {
    setPendingEdge(params);
    setModal('addEdge');
  }, []);

  const confirmAddEdge = useCallback((label) => {
    if (!pendingEdge) return;
    setEdgesRef.current((eds) => {
      const newEdge = {
        ...pendingEdge,
        id: `e${Date.now()}`,
        type: 'relationship',
        data: { label, onRenameEdge },
      };
      const next = addEdge(newEdge, eds);
      refreshDegrees(next);
      return next;
    });
    setPendingEdge(null);
    setModal(null);
  }, [pendingEdge, onRenameEdge, refreshDegrees]);

  const confirmAddPerson = useCallback((name) => {
    const id = nextId();
    setNodesRef.current((nds) => [
      ...nds,
      {
        id, type: 'person',
        position: { x: 80 + Math.random() * 420, y: 80 + Math.random() * 300 },
        data: { label: name, color: pickColor(), degree: 0, onRename: onRenameNode },
      },
    ]);
    setModal(null);
  }, [onRenameNode]);

  const deleteSelected = useCallback(() => {
    setNodesRef.current((nds) => {
      const keep = nds.filter((n) => !n.selected);
      const keepIds = new Set(keep.map((n) => n.id));
      setEdgesRef.current((eds) => {
        const next = eds.filter((e) => !e.selected && keepIds.has(e.source) && keepIds.has(e.target));
        setTimeout(() => refreshDegrees(next), 0);
        return next;
      });
      return keep;
    });
  }, [refreshDegrees]);

  const onSelectionChange = useCallback(({ nodes: sel }) => {
    setSelectedNodeId(sel.length === 1 ? sel[0].id : null);
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect} onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        fitView fitViewOptions={{ padding: 0.3 }}
        defaultEdgeOptions={{ type: 'relationship' }}
        deleteKeyCode={['Backspace', 'Delete']}
        style={{ background: '#f8fafc' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
        <Controls style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: 10 }} />
        <MiniMap
          nodeColor={(n) => n.data?.color?.border ?? '#94a3b8'}
          style={{ borderRadius: 10, border: '1px solid #e2e8f0' }}
          maskColor="rgba(248,250,252,0.7)"
        />

        {/* Toolbar */}
        <Panel position="top-left">
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
            background: 'white', border: '1px solid #e2e8f0', borderRadius: 12,
            padding: '10px 14px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111', marginRight: 4 }}>Friend Network</span>
            <button onClick={() => setModal('addPerson')} style={toolBtn('#dbeafe', '#1d4ed8', '#bfdbfe')}>+ เพิ่มคน</button>
            {hasSelection && (
              <button onClick={deleteSelected} style={toolBtn('#fee2e2', '#b91c1c', '#fecaca')}>🗑 ลบที่เลือก</button>
            )}
            <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 2px' }} />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{nodes.length} คน · {edges.length} ความสัมพันธ์</span>
          </div>
        </Panel>

        {/* Help */}
        <Panel position="bottom-left">
          <div style={{
            background: 'white', border: '1px solid #e2e8f0', borderRadius: 10,
            padding: '8px 12px', fontSize: 11, color: '#94a3b8', lineHeight: 1.9,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <div>✏️ ดับเบิ้ลคลิก Node/ชื่อความสัมพันธ์ เพื่อแก้ไขได้เลย</div>
            <div>↔ ลากจากจุด handle เพื่อเชื่อมความสัมพันธ์</div>
            <div>⌫ กด Backspace / Delete เพื่อลบ</div>
            <div>🔍 Scroll เพื่อ Zoom</div>
          </div>
        </Panel>
      </ReactFlow>

      {modal === 'addPerson' && <AddPersonModal onConfirm={confirmAddPerson} onCancel={() => setModal(null)} />}
      {modal === 'addEdge' && (
        <AddEdgeModal
          onConfirm={confirmAddEdge}
          onCancel={() => { setModal(null); setPendingEdge(null); }}
        />
      )}
    </div>
  );
}

export default function FriendNetwork() {
  return (
    <ReactFlowProvider>
      <FriendNetworkInner />
    </ReactFlowProvider>
  );
}