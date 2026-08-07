export default {
  common: {
    supportTypes: '対応ファイルタイプ:',
    desc: 'このバージョンには、画像レビューのワークフロー向けの調整が含まれています。',
    originalProjectInfo: '元のプロジェクト情報',
    originalDesc: 'MegSpotは、画像比較、ビデオ比較、画像カスタマイズ処理などの便利な機能をユーザーに提供するように設計されたクロスプラットフォームのネイティブアプリケーションです。\nqqグループ（782365536）に参加して、詳細を確認し、最新情報を入手してください。',
    manual: 'マニュアル',
    hotKey: 'ホットキー',
    please: 'お願いします',
    reset: 'リセット',
    edit: '編集',
    save: '保存',
    confirm: 'もちろん',
    cancel: 'キャンセル',
    showVideoTip: 'デモビデオを表示'
  },
  nav: {
    toHome: 'ホーム',
    back: '戻る',
    feedback: 'フィードバック'
  },
  general: {
    success: '成功',
    failure: '失敗',
    canceled: 'キャンセル',
    layout: 'レイアウト',
    aboutText: 'オン',
    introduction:
      'MegSpotは、画像比較、ビデオ比較、画像カスタマイズ処理などの便利な機能をユーザーに提供するように設計されたクロスプラットフォームのローカルアプリケーションです。\r\n詳細については、DingdingGroupを入力してください',
    videoPlay: '動画の再生',
    videoCompare: '画像比較',
    compare: '比較',
    select: '選択する',
    selected: '選択ファイル',
    language: '言語',
    baselineSide: '基準画像の位置',
    leftSide: '左側',
    rightSide: '右側',
    import: 'インポート',
    export: 'エクスポート',
    videoProcessBarStyle: 'ビデオコントロールバーの位置',
    fixed: '安定',
    float: 'フローティングボール',
    move: '移動距離(ピクセル/キーごとのプレス)',
    defaultFileListShowType: 'ファイルリストのデフォルトの表示タイプ',
    colorPickerMode: 'カラーピッカーのカラー値の表示形式',
    colorPickerMode: 'カラーピッカーにカーソル位置情報を表示',
    importOrExportSettings: 'インポート/エクスポート設定',
    list: 'リスト',
    share: '共有',
    shareAsProject: '共有するスナップショットファイルを作成する',
    show: '見せる',
    hide: '隠れる',
    thumbnail: 'サムネイル画像',
    fileName: 'ファイル名',
    fileLoading: 'ファイルを読み込んでいます...',
    filterFileName: 'フィルターファイル名',
    enableRegular: '通常の有効化/無効化',
    groupNum: 'グループ番号\nCtrl + ← 戻る \nCtrl + → 進む',
    lastModifyTime: '更新日付',
    operate: '操作する',
    size: 'ファイルサイズ',
    scale: '拡大倍率',
    sortDialogTips: 'ヒント：ファイル名をドラッグして表示順を変更できます',
    selectAll: 'すべて選択',
    clearAll: 'すべて選択解除',
    delete: '消去',
    showAll: 'すべて表示',
    history: '履歴',
    dragDropCompare: 'ドラッグアンドドロップの比較',
    imageBrowser: '画像ブラウザ',
    imageList: '画像リスト',
    videoList: 'ビデオリスト',
    invalidFolderTip: 'フォルダが存在しません。有効なパスを入力してください',
    imageFolderList: '画像フォルダ一覧',
    videoFolderList: 'ビデオフォルダリスト',
    common: '一般'
  },
  hotkey: {
    desc: '説明',
    key: 'ショートカットキー',
    back: 'ファイル選択ページに戻る',
    moveUp: '上に移動',
    moveLeft: '左に移動',
    moveRight: '向右移动',
    moveDown: '下に移動',
    pickColor: 'カラーピッカーのオン/オフを切り替えます',
    rgbText: '各ピクセルブロックのRGB値の表示を有効/無効にします。',
    pairPrevious: '前のペア',
    pairNext: '次のペア',
    pairPreviewLeft: '左側に右の画像を一時表示',
    pairPreviewRight: '右側に左の画像を一時表示',
    pairReset: '現在のペアをリセット',
    reviewToggle: '校正モードのオン/オフ',
    reviewNumbers: '校正注釈番号の表示/非表示'
  },
  dashboard: {
    compareTask: {
      title: 'ペア画像比較',
      summary: '基準ソース {leftCount} 件 · 比較ソース {rightCount} 件 · ペア {pairCount} 組',
      summaryEmpty: '左右それぞれに画像またはフォルダを追加すると、自動でペアのプレビューを作成します。',
      actions: {
        swap: '左右を入れ替え',
        refresh: 'ペアを更新',
        new: '新規比較',
        start: '比較を開始',
        resume: '比較を再開'
      },
      panels: {
        baseline: '基準画像',
        comparison: '比較画像',
        hint: '画像またはフォルダをここにドロップできます'
      },
      buttons: {
        selectImages: '画像を選択',
        selectFolders: 'フォルダを選択',
        recentFolder: '前回開いたフォルダ',
        reorderSource: 'ドラッグしてソースの順序を変更'
      },
      dialog: {
        file: '画像を選択',
        folder: 'フォルダを選択'
      },
      sourceType: {
        file: 'ファイル',
        folder: 'フォルダ'
      },
      sort: {
        fields: {
          name: '名前順',
          lastModifyTime: '更新日時順',
          size: 'サイズ順'
        },
        orders: {
          asc: '昇順',
          desc: '降順'
        }
      },
      table: {
        title: 'ペアプレビュー',
        index: '番号',
        baseline: '基準画像',
        comparison: '比較画像',
        status: '状態',
        empty: 'プレビューできるペアはまだありません'
      },
      status: {
        ready: 'ペア済み',
        missingBaseline: '基準画像なし',
        missingComparison: '比較画像なし'
      },
      placeholders: {
        missingBaseline: '基準画像が見つかりません',
        missingComparison: '比較画像が見つかりません'
      },
      confirm: {
        title: '新規比較',
        message: '現在のペア比較タスクをクリアします。続行しますか？'
      },
      messages: {
        added: 'ソースを更新しました。',
        refreshed: 'ペアを更新しました。',
        cleared: '現在の比較タスクをクリアしました。',
        swapped: '左右のソースを入れ替えました。',
        noDroppedFiles: '使用可能なパスが見つかりませんでした。',
        noSources: '先にソースを追加してください。',
        duplicates: '{count} 件の重複ソースを無視しました。',
        missing: '{count} 件の存在しないソースをスキップしました。',
        invalid: '{count} 件の無効なパスを無視しました。',
        unsupported: '{count} 件の未対応ソースを無視しました。',
        nothingReady: '左右それぞれに少なくとも 1 枚の画像が必要です。'
      },
      warnings: {
        staleTitle: 'ソースの変更を検出しました',
        staleBody: 'このペア比較タスクは保存済みのファイル集合に固定されています。ソースを再走査して現在のペア位置を保つには、ペアを更新してください。',
        staleToast: 'ソースの変更を検出しました。ディスクからこのタスクを再構築するには、ペアを更新してください。'
      },
      workspace: {
        empty: '比較できるペアがありません。ダッシュボードに戻ってペア比較タスクを作成してください。',
        returnToDashboard: 'タスクパネルに戻る',
        prev: '前へ',
        next: '次へ',
        splitUnavailable: '現在のペアは不完全なため、分割比較は利用できません。',
        modes: {
          sideBySide: '並列表示',
          single: '単一表示',
          split: '分割'
        },
        singleMode: {
          missingBaseline: '基準画像がないため、比較画像を表示しています。',
          missingComparison: '比較画像がないため、基準画像を表示しています。'
        },
        review: {
          toggle: '校正モード',
          collapse: '校正リストを閉じる',
          expand: '校正リストを開く',
          title: '翻訳 ({count})',
          empty: 'この画像に利用できる翻訳注釈はありません。',
          emptyHelp: '翻訳注釈ファイルを画像フォルダ内に配置してください。',
          emptyStates: {
            'lp-empty': { title: 'この画像はLP注釈ドキュメントに含まれていますが、注釈がありません。', help: 'このページはLPの順序に従って校正対象に含まれます。' },
            'lp-missing': { title: 'この画像はLP注釈ドキュメントに含まれていません。', help: 'このページをLPドキュメントに追加する必要があるか確認してください。' },
            'no-lp': { title: 'この画像に利用できる翻訳注釈はありません。', help: 'LP注釈ドキュメントを画像フォルダ内に配置してください。' },
            annotated: { title: '', help: '' }
          },
          showNumbers: '注釈番号を表示',
          types: {
            1: '枠内',
            2: '枠外'
          }
        },
        placeholders: {
          unmatchedBaseline: 'このペアには基準画像がありません',
          unmatchedComparison: 'このペアには比較画像がありません',
          usePrevious: '前の画像を使用'
        }
      }
    },
    entries: {
      image: {
        title: '画像',
        desc: '画像ビューア。画像の表示、比較'
      },
      video: {
        title: '動画',
        desc: '動画プレイヤー。動画の再生、比較'
      },
      viewer: {
        title: 'カスタムビューア',
        desc: 'カスタム画像処理ロジックを使用したビューアを作成する'
      }
    }
  },
  image: {
    sequence: {
      title: '画像シーケンス',
      compare: '画像シーケンスを比較する',
      compareTip: '2 つ以上の画像シーケンスを連続的に比較する'
    },
    toolbar: {
      openFolder: 'フォルダを開く',
      addFolder: 'フォルダーを追加',
      addCurrentDirectory: '現在のディレクトリを追加します',
      openFolderTip: 'システムファイルリソースマネージャーのディレクトリを開きます',
      loadShareProject: 'スナップショットのロード',
      snapshotGenerating: 'スナップショットが生成されています',
      snapshotGenerated: 'スナップショットが生成されました。ローカルに保存してください',
      resetPosition: 'リセット',
      resetPositionTip: 'スナップショットの元の位置にリセット',
      export: 'をエクスポート',
      exportTip: 'スナップショットの元の画像ファイルをエクスポートします',
      imageQueue: '画像リスト',
      compareImages: '画像を比較',
      cleanImageQueue: 'リストをクリア'
    },
    folder: {
      loadingText: 'データの読み込み...'
    },
    layout: {
      dialogTitle: '新しいレイアウト設定',
      rowLabel: '行の数',
      columnLabel: '列の数',
      confirm: '新規確認',
      layoutExists: 'レイアウト構成はすでに存在します',
      successAdded: '新しいレイアウト構成が正常に追加されました',
      confirmUseNewLayout: 'このレイアウトを今すぐ使用しますか',
      confirmDialogTitle: '新しいレイアウトを使用する',
      confirmUse: 'すぐに使用する'
    }
  },
  imagePreview: {
    title: '色とフィルター',
    brightness: '明るさ',
    contrast: 'コントラスト',
    saturate: '飽和',
    grayscale: 'グレースケール',
    invert: '反転',
    opacity: '不透明度',
    blur: 'ぼかし',
    gamma: 'ガンマ値',
    channel: 'カラーチャンネル',
    colorLevel: {
      title: '色レベル',
      input: '入力レベル',
      output: '出力レベル',
      inputShadow: '入力シャドウ',
      inputHighlight: '入力ハイライト',
      inputMidtones: '入力中間調',
      outputShadow: '出力シャドウ',
      outputHighlight: '出力ハイライト',
      histogramTip: '指定されたカラーチャネルを使用します'
    },
    reset: 'リセット',
    resetAll: 'すべてリセット'
  },
  imageCenter: {
    bilinearInterpolation: 'バイリニア補間',
    shortSelectedMsg: 'が選択されています',
    selectedMsg: 'この画像は選択されており、独立して操作できます',
    colorPicker: 'カラーピッカー',
    region: 'カラーピッカーのサイズ',
    nearestInterpolation: '最近傍補間',
    overlayLeft: '左側にオーバーレイ表示',
    overlayRight: '右側にオーバーレイ表示',
    overlayBottom: '下にオーバーレイ表示',
    overlayTop: '上にオーバーレイ表示',
    verticalFlip: '上下に反転',
    previousFrame: '前のフレーム',
    nextFrame: '次のフレーム',
    frameStep: 'フレーム比較の間隔',
    frameSteps1: '一つ一つ比較する\n逆さまに: Cmd/Ctrl + b',
    frameSteps2: '一つ一つ比較する\n再生を再開します: Cmd/Ctrl + n',
    horizontalFlip: '左右に反転',
    fullsize: 'フルサイズ',
    originalMode: '原寸モード',
    loadFailed: '画像の読み込みに失敗しました',
    retry: '再読み込み',
    returnToFileSelect: 'ファイル選択に戻る',
    adaptive: '全体を見る',
    align: '整列（サイズは同じままです）',
    align2: '整列（同じサイズ）',
    helpText:
      '画像をダブルクリックして、その画像を個別に操作できます。ファイル名をクリックして、コメントが編集できます。',
    rotate: '回転',
    generateGIF: 'gifを生成する',
    scaleTip: 'クリックしてズーム比セレクターを開きます',
    copyColorTip: 'カラー値が正常にコピーされました'
  },
  imageSetting: {
    title: '画像設定パネル',
    defaultShowHistogram: 'デフォルトの表示ヒストグラム',
    showImageName: 'イメージ名を表示',
    backgroundMode: 'バックグラウンド モード',
    scaleOpt: '尺度オプション',
    showScale: 'スケールのヒントを表示',
    showMousePos: 'マウスの位置を表示',
    annotationOpacity: '注釈番号の透明度'
  },
  imageDragDropCompare: {
    hideLine: 'ファイル名と比較行を非表示にする',
    displayLine: 'ファイル名と比較行を表示する',
    tip: 'デフォルトでは、選択された画像の最初の2つが比較されます。 変更する場合は、選択を開いて切り替えてください。'
  },
  generateGIF: {
    title: '比較働画GIFを生成',
    image: '比較図',
    description: '説明',
    operation: '操作する',
    tips: {
      wait: '生成しています、お待ちください',
      saved: 'GIFファイルを保存しました！',
      finished: 'GIFファイルを生成しました！',
      tooSmallNumber: '選択済み画像の数が少なすぎます！'
    }
  },
  video: {
    sequence: {
      title: 'ビデオシーケンス',
      label: '現在のビデオシーケンス',
      compare: 'ビデオシーケンスを比較する',
      compareTip: '2 つ以上のビデオ シーケンスを順番に比較します。',
      selectTip: '少なくとも 2 つのビデオ シーケンスを選択してください'
    },
    speed: '再生速度',
    loop: 'リピート',
    play: '再生',
    pause: '一時停止',
    reset: 'リセット',
    muted: 'ミュート',
    fullscreen: 'フルスクリーン\nESC終了フルスクリーン',
    dynamicPickColor: 'カラーピッカー調和',
    minRenderInterval: 'ビデオレンダリングの最小間隔',
    processTip: 'ビデオ プログレス バーの表示/非表示',
    displayedFrames: '現在のフレームのシーケンス番号',
    displayedFramesInSecond: 'この秒内の現在のフレーム シーケンスのシリアル番号',
    totalFrames: '総フレーム数',
    frameRate: 'フレームレート(FPS)',
    videoInfoViewerTitle: 'ビデオ情報',
    videoInfoTip: 'ビデオ情報を表示',
    reAnalyze: '検出',
    reAnalyzeTip: 'ビデオ情報を検出する',
    resetAnalyze: 'リセット',
    enableSyncTime: 'ビデオの進行状況の同期'
  },
  sortFile: {
    apply: '応用',
    addFolder: 'フォルダーを追加',
    afterAddFolder: '并从左侧目录树选择文件夹',
    edit: '次に、左側のディレクトリツリーからフォルダを選択します',
    editTip: '以下のリストに表示されるファイルの順序を変更します',
    generate: '生成',
    generateTip: 'クリックして、現在のディレクトリに.MegSpotSort.iniソート構成ファイルを生成します',
    sortFile: 'ファイルを並べ替える',
    useTableFileList: '現在のテーブル並べ替えリストを適用する',
    clearSortList: 'ソート済みリストをクリア',
    useDefaultSort: 'デフォルトの並べ替え',
    defaultSortTip: '名前でファイルを並べ替える'
  },
  gallery: {
    showTip: '現在のイメージ シーケンスの表示/非表示',
    clear: 'クリア',
    clearTip: '選択したファイルをすべてクリアしますか',
    enableNameSort: '名前順',
    enableNameSortTip: '名前で並べ替えるかどうか',
    smartSort: 'スマートソーティング',
    smartSortTip: '異なるフォルダにある同じ名前のファイルは、簡単に比較できるように一緒に並べ替えられます'
  },
  help: {
    introduction: '紹介',
    settings: '設定',
    version: 'バージョン',
    hotkey: 'ショートカット',
    log: 'ログ',
    logPage: {
      eyebrow: '診断センター',
      title: 'アプリケーションログ',
      description: '最近の実行記録を確認するか、サポート用にログフォルダーを開きます。',
      openFolder: 'ログフォルダーを開く',
      fileLabel: 'ログファイルの場所',
      recentTitle: '最近のログ',
      recentHint: '最後の 100 行',
      refresh: '更新',
      viewerLabel: '最近のアプリケーションログ',
      empty: '表示できるログがありません。',
      readError: 'ログの読み込みに失敗しました'
    }
  },
  histogram: {
    title: 'ヒストグラム',
    close: 'ヒストグラムを閉じる',
    setting: 'ヒストグラム設定',
    tip: 'このチャンネルのヒストグラムを追加/削除します',
    lineWidth: '線幅',
    multi: 'チャンネル選択タイプ',
    singleType: '無線モード',
    multiType: '複数選択モード',
    line: '複数選択モード',
    rect: '充填',
    backgroundColor: '背景色',
    drawType: '背景色'
  }
}
