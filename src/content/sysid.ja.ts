// 第 6 章の日本語版。数値・id・ref は sysid.ts と同じでなければなりません (parity.test.ts)。
import type { Source, Stage } from './tick'

const simReadme: Source = { label: 'so-arm100-sim README、Real2sim の節', ref: 'so-arm100-sim/README.md' }
const rlReadme: Source = { label: 'so-arm100-rl README、ホールドアウト差の表と real_fit', ref: 'so-arm100-rl/README.md' }
const dataset: Source = { label: 'LeRobot データセット svla_so100_pickplace', ref: 'huggingface.co/datasets/lerobot/svla_so100_pickplace' }
const motorsBus: Source = { label: 'LeRobot motors_bus.py、角度の正規化', ref: 'github.com/huggingface/lerobot' }
const mujocoActuator: Source = { label: 'MuJoCo XML リファレンス、position アクチュエータ', ref: 'mujoco.readthedocs.io/en/stable/XMLreference.html' }

export const sysid = {
  example:
    '実機側は SO-100 アームの公開記録で、30 fps のピック&プレース 50 エピソードです。シミュレーション側は同じアームの MuJoCo モデルです。この章のためにハードウェアは動かしていません。',
}

export const steps: Stage[] = [
  {
    id: 'data',
    title: '指令と応答を記録する',
    what: 'テレオペレーションするアームは毎フレーム 2 つを記録します。リーダーアームからの指令と、フォロワーが実際に到達した位置です。この 2 つの差が、シミュレーションに写したいサーボの動特性です。',
    budget: '50 エピソード、30 fps で 19,631 フレーム。どちらの信号も度単位で、グリッパーだけ 0–100 の値です。',
    failure: '接触は動特性を隠します。キューブがジョーを止めるため、グリッパーは指令から 1.6° ずれます。フィットはアームの関節だけで行います。',
    sources: [dataset, simReadme],
  },
  {
    id: 'zero',
    title: 'ゼロ点をそろえる',
    what: '実機とモデルでは角度のゼロ点が違います。LeRobot はキャリブレーションで操作者が動かした範囲の中央をゼロにするので、セットアップごとにオフセットが異なります。',
    budget: 'オフセットは局外パラメータとしてフィットします。変わるのは重力負荷だけなので、先にフィットしてから固定します。',
    failure: 'Elbow のオフセットは、ある記録では 37°、別の記録では 77° になり、範囲の境界に張り付きました。記録の間でゼロ点は共有されていません。',
    sources: [motorsBus, simReadme],
  },
  {
    id: 'replay',
    title: '指令をシミュレーションで再生する',
    what: '実機の指令を 1 フレームずつシミュレーションのアームに与え、計測した姿勢から始めて、シミュレーションのフォロワーと実機のフォロワーを関節ごとに比べます。',
    budget: 'シミュレーション自身が作った軌道は誤差ゼロで再生され、ゲインや遅延を変えると誤差が出ます。実機 10 エピソードの再生は 1 コアで 0.7 秒です。CI は毎回の push でホールドアウトのエピソード 40 を再生し、0.37° を超えると失敗します。',
    failure: '実機のフォロワーは指令から 3 フレーム (100 ms) 遅れます。これを指令遅延として加えるとシミュレーションは悪化します。シミュレーションのサーボがすでに同じだけ遅れているからです。',
    sources: [simReadme],
  },
  {
    id: 'fit',
    title: 'サーボをフィットする',
    what: 'ゲイン、減衰比、アーマチュア、関節摩擦、受動減衰を探索して 10 エピソードの再生誤差を最小にし、別の 10 エピソードで評価します。',
    budget: 'ホールドアウトの平均誤差は、モデルの既定値で 0.370°、オフセットをフィットして 0.349°、サーボもフィットして 0.294° です。ゲインは 50 → 38.8、関節摩擦は 0.1 → 0.25 です。',
    failure: '最適化は評価回数の上限で止まりました。受動減衰は 3 回の実行で 0.20、0.018、0.11 となり、このデータでは決まりません。',
    sources: [simReadme, mujocoActuator],
  },
  {
    id: 'spread',
    title: 'フィットを範囲に変える',
    what: 'エピソードごとに単独でフィットし直します。エピソード間のばらつきはランダム化範囲の根拠になり、方策の学習に使った範囲をそれと照らし合わせられます。',
    budget: 'ゲインは 32.6–38.7 (20 エピソードの 10–90 パーセンタイル) で、学習範囲 30–70 の内側です。関節摩擦は 0.22–0.28 で、学習範囲 0.05–0.2 の外側です。範囲を 0.05–0.35 に広げたプリセットなら 20 エピソードすべてを含みます。',
    failure: 'アーム 1 台、タスク 1 つです。このばらつきはエピソード間の変動で、アーム間の変動ではありません。広げたプリセットで学習した方策はまだありません。',
    sources: [simReadme],
  },
  {
    id: 'check',
    title: '効くかどうかを確かめる',
    what: 'フィットしたサーボをホールドアウトのテストセルにし、再学習する前に、手元の方策をそのセルで評価します。',
    budget: 'フィットしたサーボでの持ち上げ成功率は、スクリプトのエキスパート 0.97、名目物理で学習した PPO 0.996、ランダム化で追加学習した PPO 0.992 です。同じ名目 PPO 方策は、行動遅延 3 ステップでは 0.458 まで落ちます。',
    failure: '持ち上げタスクと状態入力の方策だけです。画像入力の模倣学習方策はまだこのセルで評価していません。',
    sources: [simReadme, rlReadme],
  },
]

export const fit = {
  rows: [
    { label: 'モデルの既定値、範囲中央のゼロ点', err: 0.37 },
    { label: 'ゼロ点をフィット', err: 0.349 },
    { label: 'ゼロ点とサーボをフィット', err: 0.294 },
  ],
  caveat: '5 つのアーム関節の平均 |シミュレーション − 実機|、ホールドアウトのエピソード 40–49、単位は度。',
  sources: [simReadme],
}
