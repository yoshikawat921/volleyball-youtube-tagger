# Volleyball Quick Tagger

限定公開YouTube動画から、バレーボールの一部プレーだけをタグ付けして見返すための静的Webアプリです。

最初のMVPで対応しているタグは次の2つだけです。

- サーブ
- アタック

トス・セットのタグ付けは実装していません。YouTube Data APIは使わず、動画のダウンロード・編集・保存もしません。保存するのはタグデータだけです。

## macOSでローカル実行する

YouTube IFrame Player APIを安定して読み込むため、ファイルを直接開くのではなくローカルWebサーバー経由で開きます。

```sh
cd /Users/yoshikawat/Documents/Codex/2026-05-24/i-am-using-the-codex-desktop/volleyball-youtube-tagger
python3 -m http.server 8000 --bind 127.0.0.1
```

ブラウザで次を開きます。

```text
http://127.0.0.1:8000
```

停止するときは、Terminalで `Control-C` を押します。

## 基本的な使い方

1. 限定公開YouTube URL、または11文字の動画IDを入力します。
2. **動画読み込み** を押します。
3. 動画タイトルは動画読み込み後に自動取得されます。
4. チームA名、チームB名、各チームの背番号リストを設定します。
5. 再生中の時刻で **サーブをタグ** または **アタックをタグ** を押します。
6. 作成されたタグに対して、クイックタグ欄でチームを選びます。
7. チーム選択後に、クイックタグ欄で背番号を選びます。
8. タグ一覧で時刻、チーム、プレー種別、背番号を確認・編集できます。
9. プレー種別、チーム、背番号で絞り込めます。
10. タグの何秒前から何秒後まで再生するかを選びます。
11. **絞り込みタグを連続再生** で、該当タグを順番に再生します。
12. 必要に応じてJSONを書き出し、あとで読み込んで作業を続けます。

## キーボードショートカット

- `Space`: 再生 / 一時停止
- `ArrowLeft`: 1秒戻る
- `ArrowRight`: 1秒進む
- `Shift + ArrowLeft`: 5秒戻る
- `Shift + ArrowRight`: 5秒進む
- `Z`: サーブをタグ
- `X`: アタックをタグ

入力欄や選択欄にフォーカスがある時は、ショートカットは無効になります。

## Google Drive自動保存

Google Apps Scriptを使うと、タグ変更後にGoogle Driveの指定フォルダへJSONを自動送信できます。ブラウザ制約を避けるため、アプリは保存データを分割してApps Scriptへ送信します。確実なバックアップとして、重要な作業後は従来どおりJSON書き出しも併用してください。

### Apps Script側の準備

1. Google Driveで保存先フォルダを作ります。
2. フォルダURLの `/folders/` 以降の文字列を控えます。これがフォルダIDです。
3. Google Apps Scriptで新しいプロジェクトを作ります。
4. このリポジトリの `Code.gs` の内容をApps Scriptへ貼り付けます。
5. `SHARED_SECRET` を自分だけが知っている文字列に変更します。
6. `DEFAULT_FOLDER_ID` を保存先フォルダIDに変更します。
7. Apps Script画面上部の関数選択で `authorizeDriveAccess` を選び、実行します。
8. 初回の権限確認を承認します。
9. Apps ScriptをWebアプリとしてデプロイします。
10. 実行ユーザーは自分、アクセスできるユーザーは運用に合わせて設定します。
11. 発行されたWebアプリURLを控えます。

### アプリ側の設定

1. アプリ画面の **Drive自動保存** を開きます。
2. **Drive自動保存を有効にする** にチェックします。
3. Apps Script WebアプリURLを入力します。
4. 保存先フォルダIDを入力します。
5. Apps Scriptの `SHARED_SECRET` と同じ保存キーを入力します。
6. **今すぐDrive保存** で送信を確認します。

以後、タグ追加・編集・削除などでローカル保存が発生したあと、数秒遅れてDriveへ自動送信されます。

Drive保存時のファイル名は `動画タイトル.json` です。同じ動画タイトルのファイルが既にある場合は上書き保存します。

### 運用上の注意

- 同じ試合JSONを複数人で同時編集する想定ではありません。
- 作業者を分ける場合は、同じ時間帯に同じプロジェクトを編集しない運用にしてください。
- WebアプリURL、保存先フォルダID、保存キーは公開リポジトリへ入れないでください。
- WebアプリURL、保存先フォルダID、保存キーの3つを知っている人は、指定フォルダへ保存できる可能性があります。チーム外へ共有しないでください。
- Google Driveフォルダ自体を「リンクを知っている全員が編集者」にしている場合、フォルダIDまたは共有URLを知った人はDrive上で直接編集できる可能性があります。
- Apps Scriptのデプロイ設定を変更した場合は、新しいWebアプリURLをアプリ側へ再設定してください。

## iPadで使う

GitHub PagesなどにホストしたURLをiPad Safariで開きます。同じWi-Fi内でMacのローカルサーバーにアクセスすることもできます。

iPad操作を想定して、次のUIを大きめにしています。

- チーム選択ボタン
- 背番号ボタン
- サーブ・アタックのタグボタン
- 再生範囲の「前」「後」秒数ボタン

iPad Safariでは、YouTube iframeとブラウザの自動再生制限により、再生・一時停止や連続再生にユーザー操作が必要になる場合があります。

## GitHub Pagesで公開する

このプロジェクトはHTML、CSS、JavaScript、JSONだけでできているため、GitHub Pagesにそのまま置けます。

公開する場合は、リポジトリに次のアプリ本体だけを置くのがおすすめです。

- `index.html`
- `style.css`
- `app.js`
- `README.md`
- `sample-project.json`

実データ入りJSON、個人情報、非公開にしたいYouTube URLは公開リポジトリに入れないでください。実際のタグデータは、アプリ上のJSON書き出し・読み込みで手元管理するのが安全です。

## データ形式

JSONはおおむね次の形式です。

```json
{
  "projectId": "任意のプロジェクトID",
  "projectName": "動画タイトル",
  "youtubeVideoId": "XXXXXXXXXXX",
  "teams": {
    "A": {
      "name": "チームA",
      "jerseyNumbers": [1, 2, 3, 4, 5, 6]
    },
    "B": {
      "name": "チームB",
      "jerseyNumbers": [7, 8, 9, 10, 11, 12]
    }
  },
  "tags": [
    {
      "id": "tag-001",
      "youtubeVideoId": "XXXXXXXXXXX",
      "time": 123.45,
      "team": "A",
      "play": "serve",
      "jerseyNumber": 8,
      "label": "A_serve_8"
    }
  ]
}
```

画面表示は日本語ですが、JSON内の `play` は `serve` / `attack` で保存します。古い `spike` のJSONは読み込み時に `attack` として扱います。

JSON内の `projectName` には、YouTube IFrame Player APIから取得した動画タイトルを保存します。

アプリは作業中のデータを `localStorage` にも保存します。ただし、確実な保存・バックアップ方法はJSON書き出しです。

## 制限

- YouTube IFrame Player APIで埋め込み再生を操作するだけです。
- YouTube Data APIは使いません。
- YouTube動画ファイルにはアクセスしません。
- 実際のMP4クリップ書き出しは初期版には含まれていません。
- 保存するのはタグデータだけで、動画ファイルは保存しません。
- ブラウザやiPad Safariの自動再生制限により、連続再生が完全自動で動かない場合があります。
