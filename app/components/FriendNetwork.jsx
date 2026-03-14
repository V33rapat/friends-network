'use client';

/**
 * FriendNetwork — Graph visualization using React Flow (@xyflow/react)
 *
 * Install dependencies:
 *   npm install @xyflow/react
 *
 * Import the required CSS in your root layout:
 *   import '@xyflow/react/dist/style.css';
 *
 * Usage:
 *   import FriendNetwork from '@/components/FriendNetwork';
 *   export default function Page() { return <FriendNetwork />; }
 */

import { useCallback, useState } from 'react';
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

// ─── Color palette ──────────────────────────────────────────────────────────
const PALETTE = [
  { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' }, // blue
  { bg: '#dcfce7', border: '#22c55e', text: '#15803d' }, // green
  { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c' }, // red
  { bg: '#fde68a', border: '#f59e0b', text: '#92400e' }, // amber
  { bg: '#ede9fe', border: '#8b5cf6', text: '#6d28d9' }, // violet
  { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' }, // pink
  { bg: '#ccfbf1', border: '#14b8a6', text: '#0f766e' }, // teal
  { bg: '#ffedd5', border: '#f97316', text: '#9a3412' }, // orange
];
let colorCursor = 0;
const pickColor = () => PALETTE[colorCursor++ % PALETTE.length];

// ─── Unique ID helper ────────────────────────────────────────────────────────
let uid = 10;
const nextId = () => String(uid++);

// ─── Relationship presets ────────────────────────────────────────────────────
const RELATIONSHIP_TYPES = [
  'เพื่อนสนิท',
  'รู้จักกัน',
  'เพื่อนร่วมงาน',
  'ครอบครัว',
  'เพื่อนเรียน',
  'อื่นๆ',
];

// ─── Shared handle style (invisible until hover) ─────────────────────────────
const handleStyle = {
  width: 10,
  height: 10,
  background: '#94a3b8',
  border: '2px solid white',
  opacity: 0,
  transition: 'opacity 0.2s',
};

// ─── Custom Person Node ──────────────────────────────────────────────────────
function PersonNode({ data, selected }) {
  const { label, color, degree = 0 } = data;
  const size = Math.max(52, Math.min(80, 52 + degree * 4));
  const initials = label
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, userSelect: 'none' }}>
      {/* Handles on all four sides */}
      {[Position.Top, Position.Bottom, Position.Left, Position.Right].map((pos) => (
        <>
          <Handle key={`s-${pos}`} type="source" position={pos} style={handleStyle} />
          <Handle key={`t-${pos}`} type="target" position={pos} style={handleStyle} />
        </>
      ))}

      {/* Avatar */}
      <div style={{
        position: 'relative',
        width: size, height: size,
        borderRadius: '50%',
        background: color.bg,
        border: `2.5px solid ${selected ? color.border : color.border + '88'}`,
        boxShadow: selected ? `0 0 0 4px ${color.border}33` : '0 2px 8px rgba(0,0,0,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.max(14, size * 0.28),
        fontWeight: 700,
        color: color.text,
        transition: 'all 0.15s ease',
        cursor: 'grab',
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

      {/* Name label */}
      <div style={{
        background: 'white',
        border: `1px solid ${color.border}55`,
        borderRadius: 20, padding: '2px 10px',
        fontSize: 12, fontWeight: 600, color: color.text,
        whiteSpace: 'nowrap', maxWidth: 120,
        overflow: 'hidden', textOverflow: 'ellipsis',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}>
        {label}
      </div>
    </div>
  );
}

// ─── Custom Relationship Edge ────────────────────────────────────────────────
function RelationshipEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected, markerEnd }) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? '#3b82f6' : '#94a3b8',
          strokeWidth: selected ? 2.5 : 1.5,
          transition: 'stroke 0.15s, stroke-width 0.15s',
        }}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              background: selected ? '#eff6ff' : 'white',
              border: `1px solid ${selected ? '#3b82f6' : '#e2e8f0'}`,
              borderRadius: 12, padding: '2px 8px',
              fontSize: 11, fontWeight: 500,
              color: selected ? '#1d4ed8' : '#64748b',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              transition: 'all 0.15s',
              cursor: 'pointer',
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { person: PersonNode };
const edgeTypes = { relationship: RelationshipEdge };

// ─── Initial graph data ──────────────────────────────────────────────────────
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
    data: {
      ...n.data,
      degree: edges.filter((e) => e.source === n.id || e.target === n.id).length,
    },
  }));
}

// ─── Modal components ────────────────────────────────────────────────────────
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
      <input
        autoFocus value={name} onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onConfirm(name.trim()); if (e.key === 'Escape') onCancel(); }}
        placeholder="ชื่อบุคคล..."
        style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }}
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
        <input
          autoFocus value={custom} onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && label) onConfirm(label); if (e.key === 'Escape') onCancel(); }}
          placeholder="ระบุความสัมพันธ์..."
          style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box', marginTop: 4 }}
        />
      )}
      <ModalActions onCancel={onCancel} onConfirm={() => label && onConfirm(label)} confirmLabel="เชื่อม" disabled={!label} />
    </Modal>
  );
}

function RenameModal({ current, onConfirm, onCancel }) {
  const [name, setName] = useState(current);
  return (
    <Modal title="แก้ไขชื่อ">
      <input
        autoFocus value={name} onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onConfirm(name.trim()); if (e.key === 'Escape') onCancel(); }}
        style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }}
      />
      <ModalActions onCancel={onCancel} onConfirm={() => name.trim() && onConfirm(name.trim())} confirmLabel="บันทึก" disabled={!name.trim()} />
    </Modal>
  );
}

// ─── Toolbar button style helper ─────────────────────────────────────────────
const toolBtn = (bg, color, border) => ({
  fontSize: 12, padding: '5px 12px', borderRadius: 20,
  border: `1px solid ${border}`, background: bg, color,
  cursor: 'pointer', fontWeight: 500,
});

// ─── Main inner component ────────────────────────────────────────────────────
function FriendNetworkInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState(withDegrees(seedNodes, seedEdges));
  const [edges, setEdges, onEdgesChange] = useEdgesState(seedEdges);
  const [modal, setModal] = useState(null);
  const [pendingEdge, setPendingEdge] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const refreshDegrees = useCallback((nextEdges) => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, degree: nextEdges.filter((e) => e.source === n.id || e.target === n.id).length },
      }))
    );
  }, [setNodes]);

  const onConnect = useCallback((params) => {
    setPendingEdge(params);
    setModal('addEdge');
  }, []);

  const confirmAddEdge = useCallback((label) => {
    if (!pendingEdge) return;
    setEdges((eds) => {
      const next = addEdge({ ...pendingEdge, id: `e${Date.now()}`, type: 'relationship', data: { label } }, eds);
      refreshDegrees(next);
      return next;
    });
    setPendingEdge(null);
    setModal(null);
  }, [pendingEdge, setEdges, refreshDegrees]);

  const confirmAddPerson = useCallback((name) => {
    const id = nextId();
    setNodes((nds) => [
      ...nds,
      {
        id, type: 'person',
        position: { x: 80 + Math.random() * 420, y: 80 + Math.random() * 320 },
        data: { label: name, color: pickColor(), degree: 0 },
      },
    ]);
    setModal(null);
  }, [setNodes]);

  const confirmRename = useCallback((name) => {
    setNodes((nds) => nds.map((n) => n.id === selectedNodeId ? { ...n, data: { ...n.data, label: name } } : n));
    setModal(null);
  }, [selectedNodeId, setNodes]);

  const deleteSelected = useCallback(() => {
    setNodes((nds) => {
      const keep = nds.filter((n) => !n.selected);
      const keepIds = new Set(keep.map((n) => n.id));
      setEdges((eds) => {
        const next = eds.filter((e) => !e.selected && keepIds.has(e.source) && keepIds.has(e.target));
        setTimeout(() => refreshDegrees(next), 0);
        return next;
      });
      return keep;
    });
  }, [setNodes, setEdges, refreshDegrees]);

  const onSelectionChange = useCallback(({ nodes: sel }) => {
    setSelectedNodeId(sel.length === 1 ? sel[0].id : null);
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const hasSelection = nodes.some((n) => n.selected) || edges.some((e) => e.selected);

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

            <button onClick={() => setModal('addPerson')} style={toolBtn('#dbeafe', '#1d4ed8', '#bfdbfe')}>
              + เพิ่มคน
            </button>

            {selectedNodeId && (
              <button onClick={() => setModal('rename')} style={toolBtn('#f3f4f6', '#374151', '#e5e7eb')}>
                ✏️ แก้ไขชื่อ
              </button>
            )}

            {hasSelection && (
              <button onClick={deleteSelected} style={toolBtn('#fee2e2', '#b91c1c', '#fecaca')}>
                🗑 ลบที่เลือก
              </button>
            )}

            <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 2px' }} />

            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              {nodes.length} คน · {edges.length} ความสัมพันธ์
            </span>
          </div>
        </Panel>

        {/* Help hints */}
        <Panel position="bottom-left">
          <div style={{
            background: 'white', border: '1px solid #e2e8f0', borderRadius: 10,
            padding: '8px 12px', fontSize: 11, color: '#94a3b8', lineHeight: 1.9,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <div>🖱 ลากโหนดเพื่อย้าย</div>
            <div>↔ ลากจากจุด handle เพื่อเชื่อมความสัมพันธ์</div>
            <div>⌫ กด Backspace / Delete เพื่อลบ</div>
            <div>🔍 Scroll เพื่อ Zoom · ดับเบิ้ลคลิกพื้นหลังเพื่อ Reset view</div>
          </div>
        </Panel>
      </ReactFlow>

      {modal === 'addPerson' && <AddPersonModal onConfirm={confirmAddPerson} onCancel={() => setModal(null)} />}
      {modal === 'addEdge'   && <AddEdgeModal   onConfirm={confirmAddEdge}   onCancel={() => { setModal(null); setPendingEdge(null); }} />}
      {modal === 'rename' && selectedNode && (
        <RenameModal current={selectedNode.data.label} onConfirm={confirmRename} onCancel={() => setModal(null)} />
      )}
    </div>
  );
}

// Wrap with ReactFlowProvider (required when used inside Next.js App Router)
export default function FriendNetwork() {
  return (
    <ReactFlowProvider>
      <FriendNetworkInner />
    </ReactFlowProvider>
  );
}