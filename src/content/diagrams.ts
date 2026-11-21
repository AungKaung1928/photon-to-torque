// One system diagram per chapter. Each step names the node it happens in; several steps may share one.
// Positions are grid cells (col 0-4, row 0-2); the component turns them into SVG coordinates.

export type NodeKind = 'sense' | 'compute' | 'bus' | 'act' | 'world' | 'check'
export const NODE_KINDS: NodeKind[] = ['sense', 'compute', 'bus', 'act', 'world', 'check']

export const KIND_LABEL: Record<NodeKind, { en: string; ja: string }> = {
  sense: { en: 'sensing', ja: '計測' },
  compute: { en: 'compute', ja: '計算' },
  bus: { en: 'data / transport', ja: 'データ / 通信' },
  act: { en: 'actuation', ja: '駆動' },
  world: { en: 'physics / sim', ja: '物理 / シミュレーション' },
  check: { en: 'check / evidence', ja: '検証 / 根拠' },
}

export interface DiagramNode {
  id: string
  kind: NodeKind
  col: number
  row: number
  en: string
  ja: string
}

export interface Diagram {
  nodes: DiagramNode[]
  edges: [string, string][]
  stepNode: Record<string, string> // stage id -> node id
}

const n = (id: string, kind: NodeKind, col: number, row: number, en: string, ja: string): DiagramNode => ({
  id,
  kind,
  col,
  row,
  en,
  ja,
})

export const DIAGRAMS: Record<string, Diagram> = {
  tick: {
    nodes: [
      n('sensor', 'sense', 0, 0, 'Camera / IMU', 'カメラ / IMU'),
      n('preprocess', 'compute', 1, 0, 'Preprocess', '前処理'),
      n('policy', 'compute', 2, 0, 'Policy net', 'ポリシー'),
      n('runtime', 'compute', 3, 0, 'ONNX / TensorRT', 'ONNX / TensorRT'),
      n('middleware', 'bus', 4, 1, 'ROS 2 / DDS', 'ROS 2 / DDS'),
      n('controller', 'act', 3, 2, 'Controller', 'コントローラ'),
      n('actuator', 'act', 2, 2, 'Motor', 'モータ'),
      n('physics', 'world', 0, 2, 'Robot + world', 'ロボットと環境'),
    ],
    edges: [
      ['sensor', 'preprocess'],
      ['preprocess', 'policy'],
      ['policy', 'runtime'],
      ['runtime', 'middleware'],
      ['middleware', 'controller'],
      ['controller', 'actuator'],
      ['actuator', 'physics'],
      ['physics', 'sensor'],
    ],
    stepNode: {
      sensor: 'sensor',
      preprocess: 'preprocess',
      policy: 'policy',
      runtime: 'runtime',
      middleware: 'middleware',
      controller: 'controller',
      actuator: 'actuator',
      physics: 'physics',
    },
  },
  ppo: {
    nodes: [
      n('policy', 'compute', 0, 0, 'Policy', 'ポリシー'),
      n('env', 'world', 0, 2, 'Simulated envs', 'シミュレーション環境'),
      n('value', 'compute', 1, 1, 'Value net', '価値関数'),
      n('buffer', 'bus', 2, 2, 'Rollout buffer', 'ロールアウトバッファ'),
      n('batches', 'bus', 3, 2, 'Minibatches', 'ミニバッチ'),
      n('objective', 'compute', 3, 0, 'Clipped loss', 'クリップ付き損失'),
      n('monitor', 'check', 4, 1, 'KL / clip fraction', 'KL / クリップ率'),
    ],
    edges: [
      ['policy', 'env'],
      ['env', 'buffer'],
      ['value', 'buffer'],
      ['buffer', 'batches'],
      ['batches', 'objective'],
      ['policy', 'objective'],
      ['objective', 'monitor'],
    ],
    stepNode: {
      rollout: 'env',
      bootstrap: 'value',
      gae: 'buffer',
      minibatch: 'batches',
      ratio: 'policy',
      clip: 'objective',
      diagnose: 'monitor',
    },
  },
  dds: {
    nodes: [
      n('discovery', 'check', 2, 0, 'Discovery / QoS', '探索と QoS 照合'),
      n('publisher', 'compute', 0, 1, 'Publisher', 'パブリッシャ'),
      n('writer', 'bus', 1, 1, 'Writer history', 'ライタ履歴'),
      n('wire', 'bus', 2, 1, 'Network', 'ネットワーク'),
      n('reader', 'bus', 3, 1, 'Reader history', 'リーダ履歴'),
      n('timers', 'check', 3, 2, 'QoS timers', 'QoS タイマー'),
      n('executor', 'compute', 4, 1, 'Executor callback', 'エグゼキュータ'),
    ],
    edges: [
      ['publisher', 'writer'],
      ['writer', 'wire'],
      ['wire', 'reader'],
      ['reader', 'executor'],
      ['discovery', 'writer'],
      ['discovery', 'reader'],
      ['timers', 'reader'],
    ],
    stepNode: {
      match: 'discovery',
      publish: 'writer',
      wire: 'wire',
      lifespan: 'reader',
      reader: 'reader',
      watch: 'timers',
      callback: 'executor',
    },
  },
  sim2real: {
    nodes: [
      n('real', 'world', 0, 0, 'Real robot', '実機'),
      n('ranges', 'bus', 1, 0, 'Parameter ranges', 'パラメータ範囲'),
      n('sim', 'world', 2, 0, 'Randomised sim', 'ランダム化シミュレーション'),
      n('policy', 'compute', 3, 0, 'Policy', 'ポリシー'),
      n('holdout', 'bus', 1, 2, 'Held-out physics', '未使用の物理'),
      n('eval', 'check', 3, 2, 'Fixed-seed eval', '固定シード評価'),
      n('metric', 'check', 4, 1, 'Metric', '指標'),
      n('report', 'check', 4, 2, 'Report', '報告'),
    ],
    edges: [
      ['real', 'ranges'],
      ['ranges', 'sim'],
      ['sim', 'policy'],
      ['policy', 'eval'],
      ['holdout', 'eval'],
      ['eval', 'metric'],
      ['metric', 'report'],
    ],
    stepNode: {
      name: 'real',
      ranges: 'ranges',
      holdout: 'holdout',
      control: 'policy',
      evaluate: 'eval',
      metric: 'metric',
      report: 'report',
    },
  },
  vla: {
    nodes: [
      n('camera', 'sense', 0, 0, 'Camera + joints', 'カメラと関節'),
      n('encoder', 'compute', 1, 0, 'Image encoder', '画像エンコーダ'),
      n('decoder', 'compute', 2, 0, 'Action decoder', '行動デコーダ'),
      n('loss', 'check', 2, 2, 'L1 loss', 'L1 損失'),
      n('queue', 'bus', 3, 1, 'Chunk ensemble', 'チャンク平均'),
      n('clock', 'check', 4, 0, 'Inference timing', '推論時間'),
      n('arm', 'act', 4, 2, 'Arm', 'アーム'),
      n('bench', 'check', 0, 2, 'Same bench eval', '同じ条件で評価'),
    ],
    edges: [
      ['camera', 'encoder'],
      ['encoder', 'decoder'],
      ['decoder', 'loss'],
      ['decoder', 'queue'],
      ['clock', 'queue'],
      ['queue', 'arm'],
      ['arm', 'bench'],
    ],
    stepNode: {
      observe: 'camera',
      encode: 'encoder',
      decode: 'decoder',
      loss: 'loss',
      ensemble: 'queue',
      timing: 'clock',
      evaluate: 'bench',
    },
  },
  sysid: {
    nodes: [
      n('log', 'bus', 0, 1, 'Command log', '指令ログ'),
      n('servo', 'act', 1, 0, 'Real servo', '実サーボ'),
      n('zero', 'sense', 2, 0, 'Encoder zero', 'エンコーダ原点'),
      n('sim', 'world', 1, 2, 'Sim replay', 'シミュレーション再生'),
      n('fit', 'compute', 3, 1, 'Servo fit', 'サーボ同定'),
      n('ranges', 'bus', 4, 0, 'Ranges', '範囲'),
      n('check', 'check', 4, 2, 'Does it matter?', '影響の確認'),
    ],
    edges: [
      ['log', 'servo'],
      ['servo', 'zero'],
      ['log', 'sim'],
      ['zero', 'fit'],
      ['sim', 'fit'],
      ['fit', 'ranges'],
      ['ranges', 'check'],
    ],
    stepNode: {
      data: 'log',
      zero: 'zero',
      replay: 'sim',
      fit: 'fit',
      spread: 'ranges',
      check: 'check',
    },
  },
}
