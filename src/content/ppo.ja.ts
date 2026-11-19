// 第2章の日本語版: 1回の PPO 更新。数値・id・ref・出典 label は ppo.ts と同一に保つ。
import type { Source, Stage } from './tick'
import { config, type DiagRow } from './ppo'

export { config }

const ppoPy: Source = { label: 'microduck-rl ppo.py, Config', ref: 'microduck-rl/ppo.py' }
const step3: Source = { label: 'microduck-rl README, step 3 results', ref: 'microduck-rl/README.md' }
const ppoPaper: Source = { label: 'Schulman et al. 2017, Proximal Policy Optimization Algorithms', ref: 'arXiv:1707.06347' }
const gaePaper: Source = { label: 'Schulman et al. 2015, Generalized Advantage Estimation', ref: 'arXiv:1506.02438' }
const timeLimits: Source = { label: 'Pardo et al. 2018, Time Limits in Reinforcement Learning', ref: 'arXiv:1712.00378' }
const details37: Source = {
  label: 'Huang et al. 2022, The 37 Implementation Details of PPO (ICLR blog track)',
  ref: 'https://iclr-blog-track.github.io/2022/03/25/ppo-implementation-details/',
}
const klBlog: Source = { label: 'Schulman, Approximating KL Divergence', ref: 'http://joschu.net/blog/kl-approx.html' }

const batch = config.numEnvs * config.numSteps
const minibatch = batch / config.minibatches
const horizonSteps = Math.round(1 / (1 - config.gamma))

export const ppo = {
  example: `Microduck のバランスポリシー: シミュレーション上のロボット ${config.numEnvs} 台がそれぞれ ${config.numSteps} ステップ動くので、1回の更新で ${batch.toLocaleString('en-US')} 個の遷移から学習します。${config.totalSteps / 1e6}M ステップは ${Math.round(config.totalSteps / batch).toLocaleString('en-US')} 回の更新です。`,
  sources: [ppoPy],
}

export const steps: Stage[] = [
  {
    id: 'rollout',
    title: 'ロールアウトを集める',
    what: '現在のポリシーを全環境で動かし、観測、アクション、そのアクションの対数確率、報酬、done フラグ、価値推定を保存します。',
    budget: `${config.numEnvs} 環境 × ${config.numSteps} ステップ = 更新 1 回あたり ${batch.toLocaleString('en-US')} 遷移。`,
    failure: '古いデータや混ざったデータ: 保存する対数確率は実際に行動したポリシーのものでなければなりません。そうでないとステップ 5 の比が誤ります。',
    sources: [ppoPy, details37],
  },
  {
    id: 'bootstrap',
    title: '時間制限でブートストラップする',
    what: 'Microduck のエピソードは常にステップ上限で終わり、本当の終端状態で終わることはありません。そこで、エピソードが続くものとして、最終観測の価値に γ を掛けた値を最後の報酬に加えます。',
    budget: `γ = ${config.gamma} はおよそ 1 / (1 − γ) = ${horizonSteps} ステップ先まで見ます。${config.controlHz} Hz では ${horizonSteps / config.controlHz} s です。`,
    failure: `時間制限を終端状態として扱うと、約 ${horizonSteps} ステップ前までの価値ターゲットが壊れます。リポジトリのユニットテストが、手計算した 3 ステップのケースでこれを示しています。`,
    sources: [step3, timeLimits],
  },
  {
    id: 'gae',
    title: 'GAE によるアドバンテージ',
    what: 'ステップごとに δ = r + γ·V(next) − V(now)。アドバンテージは δ を後ろから足し合わせ、各項を γλ で重み付けします。価値ターゲットはアドバンテージ + 価値です。',
    budget: `γ = ${config.gamma}、λ = ${config.lambda}。`,
    failure: 'λ が 1 に近いとバイアスは低く分散は高くなります。λ が 0 に近いと、まだ誤っているかもしれない価値関数を信頼することになります。',
    sources: [gaePaper, ppoPy],
  },
  {
    id: 'minibatch',
    title: 'シャッフルしてミニバッチに分ける',
    what: 'ロールアウトを平坦化してシャッフルし、ミニバッチに分割します。同じデータで数エポック繰り返します。',
    budget: `${minibatch} 件のミニバッチ ${config.minibatches} 個 × ${config.epochs} エポック = 1 ロールアウトあたり最大 ${config.minibatches * config.epochs} 回の勾配ステップ。`,
    failure: '1 つのロールアウトを何度も通しすぎると、ポリシーがそのデータを集めたポリシーから大きく離れます。その歯止めがステップ 7 です。',
    sources: [ppoPy, details37],
  },
  {
    id: 'ratio',
    title: '確率比',
    what: 'r = exp(log π_new(a|s) − log π_old(a|s))。r = 1 は、新しいポリシーがそのアクションを古いポリシーとまったく同じ頻度で選ぶことを意味します。アドバンテージはミニバッチごとに正規化します。',
    budget: '各更新の最初のミニバッチでは r = 1 ちょうどです。まだ勾配ステップが起きていないので、古いポリシーと新しいポリシーは同じネットワークです。',
    failure: '比が 1 から大きく離れているなら、このデータで更新がすでに大きく動いています。',
    sources: [ppoPaper],
  },
  {
    id: 'clip',
    title: 'クリップ付き目的関数',
    what: `Loss = −min(r·A, clip(r, 1 − ε, 1 + ε)·A)、ε = ${config.clip}。これに 0.5 × 価値損失を加えます。エントロピーボーナスは 0。勾配ノルムを 0.5 でクリップし、Adam の学習率は 3e-4 から 0 まで線形に減衰させます。`,
    budget: `ε = ${config.clip}: r が [${1 - config.clip}, ${1 + config.clip}] から有利な方向に出ると、そのサンプルの勾配はゼロになります。`,
    failure: 'クリップがゼロにするのは、すでに範囲外に出たサンプルの勾配だけです。ポリシー全体がどこまで動くかは制限しません。エポックが多いと、それでもずれていきます。',
    sources: [ppoPaper, ppoPy],
  },
  {
    id: 'diagnose',
    title: '診断して早期停止する',
    what: 'クリップ率（範囲外のサンプルの割合）、古いポリシーと新しいポリシーの近似 KL、ポリシーの σ を記録します。目標 KL を設定した場合、あるエポックの平均 KL がそれを超えた時点でエポックループを止めます。',
    budget: '後半 25M では目標 KL 0.02。前半 25M は目標 KL なしで実行しました。',
    failure: '停止がなかった前半 25M では、クリップ率の中央値が 0.48（最初の 5M ステップ）から 0.73（最後の 5M ステップ）に上がり、σ は 0.61 から 0.08 に縮みました。その間、リターンは横ばいでした。',
    sources: [step3, klBlog],
  },
]

export const diagnostics = {
  rows: [
    { metric: '更新ごとの平均近似 KL', chunk1: '0.53', chunk2: '0.032' },
    { metric: '最大近似 KL', chunk1: '173', chunk2: '0.24' },
    { metric: '平均クリップ率', chunk1: '0.66', chunk2: '0.28' },
    { metric: '終了時のポリシー σ', chunk1: '0.08', chunk2: '0.08〜0.09' },
    { metric: '評価リターン（± は 5 シード間）', chunk1: '332.6 ± 5.1', chunk2: '344.8 ± 2.9' },
  ] as DiagRow[],
  labels: { chunk1: '前半 25M: 0〜25M ステップ、KL 停止なし', chunk2: '後半 25M: 25M〜50M ステップ、目標 KL 0.02' },
  caveat:
    '後半 25M には交絡要因が 2 つあります。同じステップ区間で学習率が半分からゼロへ減衰していること、そして比較対象となる KL 停止なしの後半 25M がないことです。言えるのは、停止を入れた状態で後半 25M が改善したということまでです。改善のすべてが停止によるとは言えません。',
  sources: [step3],
}
