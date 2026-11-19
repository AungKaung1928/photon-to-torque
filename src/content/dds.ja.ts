// 第3章の日本語版。数値、id、出典の label と ref は dds.ts と同一に保ちます。
import type { Source, Stage } from './tick'
import type { QosText } from './dds'
import { qosDocs, rmwProfiles } from './dds'

export { checkQos, qosDocs, rmwProfiles } from './dds'
export type { QosText, QosSide, PolicyResult, Reliability, Durability, Liveliness } from './dds'

const rtps: Source = { label: 'OMG DDSI-RTPS specification', ref: 'https://www.omg.org/spec/DDSI-RTPS/' }
const executors: Source = {
  label: 'ROS 2 docs (Jazzy): Executors',
  ref: 'https://docs.ros.org/en/jazzy/Concepts/Intermediate/About-Executors.html',
}

export const dds = {
  example:
    '題材: 第1章の action トピックです。ポリシーノードが 50 Hz でパブリッシュし、コントローラノードが受け取ります。',
  sources: [qosDocs],
}

export const steps: Stage[] = [
  {
    id: 'match',
    title: 'ディスカバリと QoS マッチング',
    what: 'データが流れる前に、二つのノードは互いを発見して QoS を比較します。サブスクリプションは最低限の品質を要求し、パブリッシャは最大の品質を提示します。要求する QoSポリシーはすべて、提示側より厳しくてはいけません。',
    budget: '要求と提示を QoSポリシーごとに照合: 信頼性、耐久性、デッドライン、ライブネス、リース期間。',
    failure: '互換でない QoSポリシーが一つでもあれば接続せず、メッセージは届きません。ROS 2 は「incompatible QoS」イベントでしか知らせないため、ただの無音に見えます。',
    sources: [qosDocs, rtps],
  },
  {
    id: 'publish',
    title: 'writer history へのパブリッシュ',
    what: 'publish() はメッセージをミドルウェアに渡し、ミドルウェアがシリアライズして writer history に格納します。',
    budget: 'デフォルトプロファイル: keep last、depth 10。センサーデータプロファイル: keep last、depth 5。',
    failure: 'keep last ではキューが満杯になると、最も古いサンプルがエラーなしで捨てられます。',
    sources: [rmwProfiles, qosDocs],
  },
  {
    id: 'wire',
    title: '通信路上',
    what: 'ミドルウェアは RTPS でサンプルを送ります。best effort は一度だけ送ります。reliable は各リーダーが受信確認したサンプルを追跡し、欠けたものを再送します。どちらも UDP 上で動きます。',
    budget: 'デフォルトプロファイル: reliable。センサーデータプロファイル: best effort。',
    failure: '損失の多いリンクでは、best effort はサンプルを失い、reliable は再送する間の遅延と引き換えに損失を防ぎます。',
    sources: [qosDocs, rtps],
  },
  {
    id: 'lifespan',
    title: 'lifespan のチェック',
    what: 'lifespan より古いサンプルは期限切れとして黙って捨てられ、受信されることはありません。',
    budget: 'デフォルト: 未指定。ミドルウェアは通常これを無限として扱います。',
    failure: 'デフォルトのままだと、遅れて届いたコマンドも配信され、そのまま実行されます。',
    sources: [qosDocs],
  },
  {
    id: 'reader',
    title: 'reader history',
    what: 'サブスクリプションは受信したサンプルを、エグゼキュータが取り出すまで自分のキューに保持します。',
    budget: 'history と depth のルールは writer と同じです: keep last N、またはリソース制限内での keep all。',
    failure: '遅いコールバックの後ろに深いキューがあると、コントローラは古いコマンドを順番に処理することになります。',
    sources: [qosDocs],
  },
  {
    id: 'watch',
    title: 'デッドラインとライブネス',
    what: 'デッドラインはメッセージ間の想定最大間隔を決めます。ライブネスとそのリース期間は、パブリッシャがどれだけ黙っていたら失われたとみなすかを決めます。どちらもノードが処理できるイベントを発生させます。',
    budget: 'デフォルト: デッドラインとリース期間はどちらも未指定。',
    failure: 'デッドラインがないと、クラッシュしたポリシーノードと静かなだけのノードの区別がつきません。コントローラは独自のウォッチドッグがない限り、最後のコマンドを保持し続けます。',
    sources: [qosDocs],
  },
  {
    id: 'callback',
    title: 'エグゼキュータがコールバックを実行',
    what: 'エグゼキュータはサンプルを取り出し、サブスクリプションのコールバックを呼びます。シングルスレッドのエグゼキュータは、一つのスレッドでコールバックを一つずつ実行します。',
    budget: null,
    failure: '同じシングルスレッドのエグゼキュータ内に遅いコールバックがあると、このコールバックも遅れます。コールバックグループとマルチスレッドのエグゼキュータで分離できます。',
    sources: [executors],
  },
]

export const qosText: QosText = {
  reliability: '信頼性 (Reliability)',
  durability: '耐久性 (Durability)',
  deadline: 'デッドライン',
  liveliness: 'ライブネス',
  lease: 'リース期間',
  noLimit: 'サブスクリプションは制限を要求していません。',
  requestedNothing: (req) => `サブスクリプションは ${req} ms を要求していますが、パブリッシャは何も保証していません。`,
  withinRequest: (offered, req) => `提示された ${offered} ms は要求の ${req} ms 以内です。`,
  longerThanRequest: (offered, req) => `提示された ${offered} ms は要求の ${req} ms より長いです。`,
  relOk: 'パブリッシャはサブスクリプションの要求以上を提示しています。',
  relBlocked: 'サブスクリプションは reliable を要求していますが、パブリッシャは best effort しか提示していません。',
  durStored: '後から参加したサブスクリプションも保存済みのメッセージを受け取ります。',
  durNewOnly: '新しいメッセージのみです。',
  durBlocked: 'サブスクリプションは保存済みのメッセージを要求していますが、パブリッシャは何も保存していません。',
  livOk: '種類が互換です。',
  livBlocked: 'サブスクリプションは manual by topic を要求していますが、パブリッシャは automatic です。',
}

// rmw_qos_profile_default と rmw_qos_profile_sensor_data、rmw Jazzy。
export const profiles = [
  { policy: 'History', defaults: 'keep last', sensor: 'keep last' },
  { policy: 'Depth', defaults: '10', sensor: '5' },
  { policy: '信頼性 (Reliability)', defaults: 'reliable', sensor: 'best effort' },
  { policy: '耐久性 (Durability)', defaults: 'volatile', sensor: 'volatile' },
  { policy: 'デッドライン、lifespan、リース期間', defaults: 'デフォルト(未指定)', sensor: 'デフォルト(未指定)' },
  { policy: 'ライブネス', defaults: 'システムデフォルト', sensor: 'システムデフォルト' },
]
