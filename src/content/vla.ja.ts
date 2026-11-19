// 第5章の日本語版: 1つのアクションチャンク。数値・id・ref・出典 label は vla.ts と同一に保つ。
import type { Source, Stage } from './tick'

export { smolvla } from './vla'

const il: Source = { label: 'so-arm100-il README, ACTLite against single-step cloning', ref: 'so-arm100-il/README.md' }
const vlaReadme: Source = { label: 'so-arm100-vla README, SmolVLA-base timed on CPU', ref: 'so-arm100-vla/README.md' }
const act: Source = { label: 'Zhao et al. 2023, ACT, Algorithm 2', ref: 'arXiv:2304.13705' }
const lerobotAct: Source = {
  label: 'LeRobot 0.6.1, ACTTemporalEnsembler and ACT config defaults',
  ref: 'lerobot/policies/act/modeling_act.py',
}

export const vla = {
  example:
    '題材: シミュレーション上の SO-ARM100 アームが 20 Hz でキューブを持ち上げます。スクリプト化したエキスパートによる 200 件のデモからクローニングしたポリシーです。ここに実機由来の数値はありません。',
}

export const steps: Stage[] = [
  {
    id: 'observe',
    title: '観測する',
    what: '制御ステップごとに、ポリシーはカメラ画像 1 枚とアームの関節状態を受け取ります。',
    budget: '20 Hz 制御: 50 ms ごとに 1 ステップ。15 次元の関節状態とレンダリング画像 1 枚。',
    failure: '関節状態だけではキューブの位置が分かりません。状態のみのポリシーの持ち上げ成功率は、200 デモで 0.03 ± 0.01 です。',
    sources: [il],
  },
  {
    id: 'encode',
    title: 'トークンにエンコードする',
    what: '小さな CNN が画像を空間 soft-argmax キーポイントに変換します。キーポイントと関節状態が transformer エンコーダのトークンになります。',
    budget: 'ACTLite: キーポイントトークンと関節状態トークン 1 個、2 層エンコーダ。CVAE を除いた ACT です。',
    failure: '小さな物体は知覚の問題です。9 mm のキューブでは ACTLite の持ち上げ成功率は 0.38 ± 0.05 で、真の姿勢を見ているエキスパートは 0.73 ± 0.05 です。',
    sources: [il],
  },
  {
    id: 'decode',
    title: 'チャンクをデコードする',
    what: 'デコーダは k 個の学習済みクエリに一度に答えます。1 クエリが将来の 1 ステップに対応します。出力は 1 個ではなく k 個の関節目標ベクトルです。',
    budget: 'ACTLite: k = 20、20 Hz で 1 s 分の動作です。LeRobot の ACT のデフォルト: k = 100。',
    failure: 'シングルステップのポリシーは 50 ms ごとに判断し直すので、小さな誤差が積み重なります。エキスパートに対する最悪関節の誤差は、最初の 10 ステップの 0.4–0.5 rad から、ステップ 60–150 には 1.1–4.6 rad まで増えます。',
    sources: [il, act, lerobotAct],
  },
  {
    id: 'loss',
    title: 'L1 で訓練する',
    what: '訓練では、予測したチャンク全体を次の k 個のデモのアクションと比較し、正規化したアクションに L1 を使います。エピソードの終わりを越えた要素はマスクします。',
    budget: 'L1 は条件付き中央値に当てはまり、それはデモのモードの一つです。ACT も L1 で訓練します。',
    failure: 'MSE は平均に当てはまります。デモが 2 つの有効な角度で把持していると、平均は 3 つ目の角度になり、何も把持できません。',
    sources: [il, act],
  },
  {
    id: 'ensemble',
    title: '重なったチャンクをアンサンブルする',
    what: '時間的アンサンブルではポリシーを毎ステップ実行するので、最大 k 個のチャンクが現在ステップの予測を持ちます。それらを重み wᵢ = exp(−m·i) で平均します。i = 0 が最も古い予測です。',
    budget: 'm = 0.01、元の ACT の研究で使われた値です。古い予測ほどわずかに重く扱われます。',
    failure: 'アンサンブルには制御ステップごとに 1 回の推論が必要です。50 ms より遅いモデルは 20 Hz でアンサンブルできず、各チャンクをオープンループで実行するしかありません。',
    sources: [lerobotAct, act],
  },
  {
    id: 'timing',
    title: '推論をチャンク内に収める',
    what: 'アンサンブルなしでは、アームは 1 チャンクをオープンループで実行し、その後に次のチャンクが必要になります。推論がチャンクの継続時間より長くかかると、アームは止まって待ちます。',
    budget: 'SmolVLA-base: 8 CPU スレッドで 50 ステップのチャンク 1 個あたり 3.16 s（p50、n = 130）。チャンクは 20 Hz で 2.5 s 続きます。',
    failure: '推論と動作を順番に実行すると、アームは 2.5 s の動作ごとに約 3 s 待つことになります。この CPU では、成功率がどうであれリアルタイムコントローラにはなりません。',
    sources: [vlaReadme],
  },
  {
    id: 'evaluate',
    title: '同じベンチで評価する',
    what: 'チャンク方式とシングルステップのポリシーを、同じデモ、同じエンコーダ系統、同じ損失、同じ評価シードで比較します。違うのはチャンクだけです。',
    budget: '200 デモ: ACTLite 0.77 ± 0.05、シングルステップ 0.05 ± 0.02、スクリプト化エキスパート 0.93 ± 0.02。100 エピソード × 評価シード 5 個。',
    failure: '0.77 は訓練シード 1 個の結果です。200 デモで訓練シード 6 個を回すと、0.92、0.82、0.76 と 0.24、0.18、0.12 に分かれました。',
    sources: [il],
  },
]

export const scaling = {
  rows: [
    { demos: 10, image: [0.01, 0.01], act: [0.08, 0.1] },
    { demos: 25, image: [0.03, 0.01], act: [0.24, 0.19] },
    { demos: 50, image: [0.02, 0.03], act: [0.3, 0.28] },
    { demos: 100, image: [0.04, 0.02], act: [0.41, 0.29] },
    { demos: 200, image: [0.05, 0.06], act: [0.51, 0.36] },
  ] as { demos: number; image: [number, number]; act: [number, number] }[],
  protocol:
    '持ち上げ成功率、20 エポック、訓練シードごとに評価 50 エピソード。± は訓練シード間の標準偏差です（シングルステップ 3 個、チャンク方式 6 個）。',
  caveat:
    'シングルステップのポリシーの検証 L1 は、10 デモから 200 デモで 5 分の 1 に下がりました（0.181 から 0.036）。それでも成功率は 0.01〜0.05 のままでした。チャンク方式の平均は 200 デモでまだ頭打ちになっていませんでした。',
  sources: [il],
}
