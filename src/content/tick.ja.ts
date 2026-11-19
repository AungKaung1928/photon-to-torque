// 第1章の日本語版: 1回の制御ティック。数値・id・ref・出典 label は tick.ts と同一に保つ。
import type { GapRow, Source, Stage } from './tick'

const microduckReadme: Source = { label: 'microduck-rl README', ref: 'microduck-rl/README.md' }
const soArmReadme: Source = { label: 'so-arm100-rl README, held-out gap table', ref: 'so-arm100-rl/README.md' }

export const tick = {
  example: 'Microduck の歩行ポリシー: 500 Hz の物理の上で 50 Hz のポリシーが動くので、1回の制御ティックは 20 ms、物理ステップ 10 回分です。',
  sources: [microduckReadme],
}

export const timing = {
  tickMs: 20,
  physicsStepMs: 2,
  policyP50Ms: 0.01,
  policyP99Ms: 0.033,
  policyNote: 'ONNX Runtime、intra-op スレッド 1 本、バッチ 1、CPU。',
  sources: [microduckReadme],
}

export const latencyGap = {
  rows: [
    { physics: 'ノミナル物理', nominalTrained: { success: 0.998, sd: 0.004 }, drFineTuned: { success: 0.998, sd: 0.004 } },
    { physics: 'アクションのレイテンシ 3 ステップ', nominalTrained: { success: 0.458, sd: 0.052 }, drFineTuned: { success: 0.76, sd: 0.03 } },
  ] as GapRow[],
  protocol: '各セル 100 エピソード × 評価シード 5 個。± は評価シード間の標準偏差です。',
  caveat:
    '訓練シードはポリシーごとに 1 個です。DR ポリシーはさらに 10 M ステップ長く訓練しており、同じ長さのノミナル訓練はまだ実施していません。シミュレーションのみで、実機アームでは何も計測していません。',
  drRange: '訓練ではアクションのレイテンシを 0〜2 ステップでランダム化したので、3 ステップは DR ポリシーが見た範囲の 1 ステップ外です。',
  sources: [soArmReadme],
}

export const stages: Stage[] = [
  {
    id: 'sensor',
    title: '光子からセンサへ',
    what: '露光と読み出し。ローリングシャッターは行ごとに異なる時刻で読み出し、グローバルシャッターは全体を同時に読み出します。',
    budget: null,
    failure: 'ロボットが速く動くと、モーションブラーとローリングシャッター歪みが出ます。',
    sources: [], // TODO: cite one real camera datasheet
  },
  {
    id: 'preprocess',
    title: '前処理',
    what: '生の読み値を、ポリシーが訓練で見た観測に変換します。Microduck はカメラを使わず、48 次元の固有受容観測を使います。',
    budget: null,
    failure: 'デプロイ時の正規化が訓練時と異なります。',
    sources: [microduckReadme],
  },
  {
    id: 'policy',
    title: 'ポリシーの順伝播',
    what: '小さな MLP が観測を 14 個の関節位置残差に変換します。',
    budget: 'ONNX Runtime p50 / p99 0.010 / 0.033 ms、1 スレッド、バッチ 1: 20 ms の制御ティックの 0.2%。',
    failure: 'エクスポートしたグラフが訓練済みモデルと一致しません（1,000 観測で計測した最大差は 2.4e-06）。',
    sources: [microduckReadme],
  },
  {
    id: 'runtime',
    title: 'ランタイム: ONNX / TensorRT',
    what: 'グラフをエクスポートし、エンジンをビルドし、精度を選びます。',
    budget: null,
    failure: 'FP16 / INT8 で精度が落ちます。TensorRT エンジンは、ビルドに使った GPU と TensorRT バージョンに縛られます。',
    sources: [
      { label: 'ONNX', ref: 'https://onnx.ai' },
      { label: 'NVIDIA TensorRT Developer Guide', ref: 'https://docs.nvidia.com/deeplearning/tensorrt/' },
    ],
  },
  {
    id: 'middleware',
    title: 'ミドルウェア: ROS 2 / DDS',
    what: 'アクションをパブリッシュします。QoS ポリシーが信頼性、履歴の深さ、デッドラインを決めます。',
    budget: null,
    failure: 'メッセージが古くなるか欠落します。パブリッシャとサブスクライバの QoS が互換でないと接続されません。',
    sources: [
      { label: 'ROS 2 docs: About Quality of Service settings', ref: 'https://docs.ros.org/en/jazzy/Concepts/Intermediate/About-Quality-of-Service-Settings.html' },
    ],
  },
  {
    id: 'controller',
    title: 'コントローラ',
    what: 'PD ループが位置目標を物理レートでトルクに変換します。',
    budget: 'ポリシーの制御ティック 1 回につき PD 更新 10 回（50 Hz の内側で 500 Hz）。',
    failure: 'シミュレーションで調整したゲインが実機のサーボに合いません。',
    sources: [microduckReadme, { label: 'ros2_control docs', ref: 'https://control.ros.org' }],
  },
  {
    id: 'actuator',
    title: 'モータ / アクチュエータ',
    what: 'サーボは遅れ、摩擦、トルク制限という自身のダイナミクスを持って目標に追従します。',
    budget: null,
    failure: 'アクチュエータのダイナミクスがシミュレーションモデルと異なります。sim-to-real ギャップの主な原因の一つです。',
    sources: [{ label: 'Hwangbo et al. 2019, Science Robotics', ref: 'arXiv:1901.08652' }],
  },
  {
    id: 'physics',
    title: '物理から次の観測へ',
    what: '世界が動き、センサが新しい状態を読み、次の制御ティックが始まります。',
    budget: '物理ステップ 2 ms（500 Hz）。',
    failure: 'アクションの適用が遅れます。so-arm100-rl では、アクションのレイテンシ 3 ステップ（DR 範囲の 1 ステップ外）で、成功率がノミナル訓練のポリシーで 0.998 → 0.458、DR ありで 0.998 → 0.760 に下がりました。',
    sources: [microduckReadme, { label: 'so-arm100-rl README', ref: 'so-arm100-rl/README.md' }],
  },
]
