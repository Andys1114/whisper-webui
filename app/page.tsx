'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';

const translations = {
  zh: {
    uiLanguageTitle: '界面语言',
    pageTitle: 'Groq Whisper API 转 SRT',
    subtitle: '通过 Groq API 将音频文件转录并转换为 SRT 格式。',
    apiKeyLabel: 'Groq API 密钥:',
    apiKeyPlaceholder: '请输入您的 Groq API 密钥',
    modelLabel: '选择模型:',
    modelOptionDefault: 'Whisper Large V3 (默认)',
    modelOptionTurbo: 'Whisper Large V3 Turbo',
    transcriptionLangLabel: '选择语言（可选）:',
    autoDetect: '自动检测',
    uploadInstruction: '点击此处或 <span class="font-semibold text-sky-400">拖拽</span> 音频文件到这里上传',
    uploadHint: '(例如: .mp3, .wav, .m4a, .ogg, .flac, .opus)',
    clearBtn: '清空',
    srtOutputLabel: 'SRT 输出:',
    collapse: '收起',
    expand: '展开',
    srtPlaceholder: '这里将显示转换后的 SRT 内容...',
    copySrt: '复制 SRT',
    downloadSrt: '下载 .srt',
    errorTitle: '发生错误',
    closeBtn: '关闭',
    transcribing: '正在转录音频，请稍候...',
    requestingTranscription: '正在请求 Groq API 进行转录...',
    apiKeyRequired: '请输入您的 Groq API 密钥。',
    fileEmpty: '上传的音频文件为空，请选择一个有效的文件。',
    invalidAudioType: '请上传有效的音频文件 (例如: .mp3, .wav, .m4a 等)。',
    groqRequestFailed: 'Groq API 请求失败',
    unknownError: '未知错误',
    groqResponseInvalid: 'Groq API 响应格式不正确，未能找到字幕片段。',
    apiCallError: '调用 Groq API 时出错',
    apiRequestFailedText: 'API 请求失败。',
    apiResponseErrorText: 'API 响应格式错误。',
    apiCallErrorText: 'API 调用出错。',
    noSubtitleData: '没有可转换的字幕数据。',
    srtGenerationEmpty: '未能从转录结果中生成有效的 SRT 内容。',
    srtConversionError: 'SRT 转换过程中发生错误',
    srtConversionFailed: 'SRT 转换失败。',
    contentCleared: '内容已清空。',
    selectedFile: '已选择:',
    transcribeSuccess: '音频转录成功并已转换为 SRT!',
    srtCopied: 'SRT 内容已复制到剪贴板！',
    noSrtToCopy: '没有可复制的 SRT 内容。',
    copyFailed: '复制失败: ',
    downloadStarted: 'SRT 文件已开始下载。',
    noContentToDownload: '没有可下载的内容。',
  },
  en: {
    uiLanguageTitle: 'UI Language',
    pageTitle: 'Groq Whisper API to SRT',
    subtitle: 'Transcribe audio via Groq API and convert to SRT format.',
    apiKeyLabel: 'Groq API Key:',
    apiKeyPlaceholder: 'Enter your Groq API key',
    modelLabel: 'Select model:',
    modelOptionDefault: 'Whisper Large V3 (default)',
    modelOptionTurbo: 'Whisper Large V3 Turbo',
    transcriptionLangLabel: 'Select language (optional):',
    autoDetect: 'Auto detect',
    uploadInstruction: 'Click here or <span class="font-semibold text-sky-400">drag</span> an audio file to upload',
    uploadHint: '(e.g., .mp3, .wav, .m4a, .ogg, .flac, .opus)',
    clearBtn: 'Clear',
    srtOutputLabel: 'SRT Output:',
    collapse: 'Collapse',
    expand: 'Expand',
    srtPlaceholder: 'Converted SRT content will appear here...',
    copySrt: 'Copy SRT',
    downloadSrt: 'Download .srt',
    errorTitle: 'Error occurred',
    closeBtn: 'Close',
    transcribing: 'Transcribing audio, please wait...',
    requestingTranscription: 'Requesting Groq API transcription...',
    apiKeyRequired: 'Please enter your Groq API key.',
    fileEmpty: 'Uploaded audio file is empty. Please select a valid file.',
    invalidAudioType: 'Please upload a valid audio file (e.g., .mp3, .wav, .m4a).',
    groqRequestFailed: 'Groq API request failed',
    unknownError: 'Unknown error',
    groqResponseInvalid: 'Groq API response invalid; no segments found.',
    apiCallError: 'Error calling Groq API',
    apiRequestFailedText: 'API request failed.',
    apiResponseErrorText: 'API response error.',
    apiCallErrorText: 'API call error.',
    noSubtitleData: 'No subtitle data to convert.',
    srtGenerationEmpty: 'Could not generate valid SRT content from transcription.',
    srtConversionError: 'Error during SRT conversion',
    srtConversionFailed: 'SRT conversion failed.',
    contentCleared: 'Content cleared.',
    selectedFile: 'Selected:',
    transcribeSuccess: 'Audio transcribed and converted to SRT!',
    srtCopied: 'SRT content copied to clipboard!',
    noSrtToCopy: 'No SRT content to copy.',
    copyFailed: 'Copy failed: ',
    downloadStarted: 'SRT file download started.',
    noContentToDownload: 'No content to download.',
  },
} as const;

type Language = keyof typeof translations;
type Translation = (typeof translations)[Language];
type TranslationKey = keyof Translation;

type Segment = {
  start: number;
  end: number;
  text: string;
};

type ProgressState = {
  visible: boolean;
  value: number;
  key?: TranslationKey;
  text?: string;
};

type SrtDisplay =
  | { type: 'placeholder' }
  | { type: 'message'; key?: TranslationKey; text?: string }
  | { type: 'srt'; text: string };

type NotificationState = { message: string; type: 'success' | 'error' } | null;

const API_KEY_STORAGE_KEY = 'groqApiKey';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions';

const ACCEPTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/mp3',
  'audio/x-m4a',
  'audio/m4a',
  'audio/ogg',
  'audio/flac',
  'audio/opus',
];

function formatTime(timeInSeconds: number) {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const milliseconds = Math.round((timeInSeconds - Math.floor(timeInSeconds)) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

function convertSegmentsToSrt(segments: Segment[]) {
  let srtContent = '';

  segments.forEach((segment, index) => {
    if (
      typeof segment.start !== 'number' ||
      typeof segment.end !== 'number' ||
      typeof segment.text !== 'string'
    ) {
      return;
    }

    const startTime = formatTime(segment.start);
    const endTime = formatTime(segment.end);
    const text = segment.text.trim();

    srtContent += `${index + 1}\n${startTime} --> ${endTime}\n${text}\n\n`;
  });

  return srtContent.trim().length > 0 ? srtContent.trimEnd() + '\n' : '';
}

export default function HomePage() {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('whisper-large-v3');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [uiLanguage, setUiLanguage] = useState<Language>('zh');
  const [showLanguageSelect, setShowLanguageSelect] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [originalFileName, setOriginalFileName] = useState('output');
  const [isSrtVisible, setIsSrtVisible] = useState(true);
  const [showSrtSection, setShowSrtSection] = useState(false);
  const [srtDisplay, setSrtDisplay] = useState<SrtDisplay>({ type: 'placeholder' });
  const [progressState, setProgressState] = useState<ProgressState>({ visible: false, value: 0 });
  const [notification, setNotification] = useState<NotificationState>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const languageSelectRef = useRef<HTMLDivElement | null>(null);

  const text = translations[uiLanguage];

  const displaySrt = useMemo(() => {
    if (srtDisplay.type === 'placeholder') {
      return text.srtPlaceholder;
    }

    if (srtDisplay.type === 'message') {
      return srtDisplay.text ?? (srtDisplay.key ? text[srtDisplay.key] : '');
    }

    return srtDisplay.text ?? '';
  }, [srtDisplay, text]);

  const canInteractWithSrt = srtDisplay.type === 'srt' && (srtDisplay.text?.trim().length ?? 0) > 0;
  const progressText = progressState.text ?? (progressState.key ? text[progressState.key] : '');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedKey = window.localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
    }

    const browserLang = window.navigator.language?.toLowerCase() ?? '';
    setUiLanguage(browserLang.startsWith('zh') ? 'zh' : 'en');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (apiKey) {
      window.localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    } else {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }, [apiKey]);

  useEffect(() => {
    if (!showLanguageSelect) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!languageSelectRef.current) return;
      if (!languageSelectRef.current.contains(event.target as Node)) {
        setShowLanguageSelect(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLanguageSelect]);

  useEffect(() => {
    if (!notification) return;

    const timer = window.setTimeout(() => setNotification(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notification]);

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  }, []);

  const notify = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  }, []);

  const concludeLoading = useCallback(() => {
    setProgressState((prev) => ({ ...prev, value: 100, key: undefined, text: undefined }));
    setTimeout(() => {
      setProgressState({ visible: false, value: 0 });
    }, 600);
  }, []);

  const resetToPlaceholder = useCallback(() => {
    setSrtDisplay({ type: 'placeholder' });
    setShowSrtSection(false);
    setIsSrtVisible(true);
    setProgressState({ visible: false, value: 0 });
  }, []);

  const handleClear = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setSelectedFileName('');
    setOriginalFileName('output');
    resetToPlaceholder();
    notify(text.contentCleared, 'success');
  }, [notify, resetToPlaceholder, text]);

  const handleCopy = useCallback(async () => {
    if (!canInteractWithSrt || !srtDisplay.text) {
      showError(text.noSrtToCopy);
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(srtDisplay.text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = srtDisplay.text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      notify(text.srtCopied, 'success');
    } catch (error) {
      showError(`${text.copyFailed}${(error as Error).message ?? ''}`);
    }
  }, [canInteractWithSrt, notify, showError, srtDisplay, text]);

  const handleDownload = useCallback(() => {
    if (!canInteractWithSrt || !srtDisplay.text) {
      showError(text.noContentToDownload);
      return;
    }

    const blob = new Blob([srtDisplay.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${originalFileName || 'output'}.srt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    notify(text.downloadStarted, 'success');
  }, [canInteractWithSrt, notify, originalFileName, showError, srtDisplay, text]);

  const handleAudioFileAndTranscribe = useCallback(
    async (file: File) => {
      if (!apiKey.trim()) {
        showError(text.apiKeyRequired);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      if (file.size === 0) {
        showError(text.fileEmpty);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      const isAcceptedType =
        ACCEPTED_AUDIO_TYPES.includes(file.type) ||
        /\.(mp3|wav|m4a|ogg|flac|opus)$/i.test(file.name);

      if (!isAcceptedType) {
        showError(text.invalidAudioType);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setSelectedFileName(file.name);
      const sanitizedName = file.name.replace(/\.[^/.]+$/, '');
      setOriginalFileName(sanitizedName || 'output');
      setSrtDisplay({ type: 'message', key: 'requestingTranscription' });
      setShowSrtSection(true);
      setIsSrtVisible(true);
      setProgressState({ visible: true, value: 50, key: 'requestingTranscription' });

      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('model', selectedModel);
      formData.append('response_format', 'verbose_json');
      if (selectedLanguage) {
        formData.append('language', selectedLanguage);
      }

      try {
        const response = await fetch(GROQ_ENDPOINT, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey.trim()}` },
          body: formData,
        });

        if (!response.ok) {
          let errorMessage = `${text.groqRequestFailed}: ${response.status} ${response.statusText}.`;
          try {
            const errorData = await response.json();
            if (errorData?.error?.message) {
              errorMessage += ` ${errorData.error.message}`;
            }
          } catch {
            errorMessage += ` ${text.unknownError}`;
          }

          showError(errorMessage);
          setSrtDisplay({ type: 'message', key: 'apiRequestFailedText' });
          concludeLoading();
          return;
        }

        const transcriptionResult = await response.json();
        concludeLoading();

        if (transcriptionResult && Array.isArray(transcriptionResult.segments)) {
          const srtContent = convertSegmentsToSrt(transcriptionResult.segments as Segment[]);

          if (srtContent.trim().length === 0) {
            setSrtDisplay({ type: 'message', key: 'srtGenerationEmpty' });
            showError(text.noSubtitleData);
            return;
          }

          setSrtDisplay({ type: 'srt', text: srtContent });
          notify(text.transcribeSuccess, 'success');
        } else {
          showError(text.groqResponseInvalid);
          setSrtDisplay({ type: 'message', key: 'apiResponseErrorText' });
        }
      } catch (error) {
        concludeLoading();
        showError(`${text.apiCallError}: ${(error as Error).message}`);
        setSrtDisplay({ type: 'message', key: 'apiCallErrorText' });
      }
    },
    [apiKey, concludeLoading, notify, selectedLanguage, selectedModel, showError, text]
  );

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void handleAudioFileAndTranscribe(file);
      }
    },
    [handleAudioFileAndTranscribe]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(false);
      const file = event.dataTransfer.files?.[0];
      if (file) {
        void handleAudioFileAndTranscribe(file);
      }
    },
    [handleAudioFileAndTranscribe]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragActive(false);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid bg-[size:32px_32px] opacity-70" />
      <div className="pointer-events-none absolute inset-0 -z-20 bg-gradient-to-br from-sky-500/20 via-transparent to-emerald-500/10" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full space-y-10 rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-2xl sm:p-12">
          <div className="flex justify-end" ref={languageSelectRef}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLanguageSelect((prev) => !prev)}
                title={text.uiLanguageTitle}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-slate-300 shadow-inner transition hover:border-sky-400 hover:text-white"
              >
                🌐
              </button>
              {showLanguageSelect && (
                <div className="absolute right-0 top-12 z-10 w-32 rounded-xl border border-white/10 bg-slate-900/95 p-1 shadow-lg">
                  <select
                    value={uiLanguage}
                    onChange={(event) => {
                      setUiLanguage(event.target.value as Language);
                      setShowLanguageSelect(false);
                    }}
                    className="w-full cursor-pointer rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
                  >
                    <option value="zh">中文</option>
                    <option value="en">English</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <header className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-500/40 bg-sky-500/10 text-2xl">
              🎧
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                {text.pageTitle}
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-slate-300 sm:text-base">{text.subtitle}</p>
          </header>

          <div className="grid gap-6 text-sm text-slate-200 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                {text.apiKeyLabel}
              </span>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={text.apiKeyPlaceholder}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 shadow-inner outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                {text.modelLabel}
              </span>
              <select
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                className="w-full cursor-pointer rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              >
                <option value="whisper-large-v3">{text.modelOptionDefault}</option>
                <option value="whisper-large-v3-turbo">{text.modelOptionTurbo}</option>
              </select>
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                {text.transcriptionLangLabel}
              </span>
              <select
                value={selectedLanguage}
                onChange={(event) => setSelectedLanguage(event.target.value)}
                className="w-full cursor-pointer rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="">{text.autoDetect}</option>
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="ko">한국어</option>
                <option value="it">Italiano</option>
                <option value="pt">Português</option>
                <option value="ru">Русский</option>
              </select>
            </label>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 text-center transition ${
              isDragActive
                ? 'border-sky-400 bg-slate-900/90'
                : 'border-white/10 bg-slate-950/60 hover:border-sky-500/70 hover:bg-slate-900/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <svg
              className="mb-4 h-12 w-12 text-slate-500 transition group-hover:text-sky-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.344 11.09A4.5 4.5 0 0112 21.75v-2.25"
              />
            </svg>
            <p
              className="text-sm text-slate-300"
              dangerouslySetInnerHTML={{ __html: text.uploadInstruction }}
            />
            <p className="mt-2 text-xs text-slate-500">{text.uploadHint}</p>
            {selectedFileName && (
              <p className="mt-4 text-xs font-medium text-slate-400">
                {text.selectedFile} {selectedFileName}
              </p>
            )}
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200 shadow-inner transition hover:border-emerald-400 hover:text-white"
            >
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              {text.clearBtn}
            </button>
          </div>

          {progressState.visible && (
            <div className="space-y-2">
              <p className="text-center text-sm text-slate-400">{progressText}</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400 transition-all"
                  style={{ width: `${progressState.value}%` }}
                />
              </div>
            </div>
          )}

          {showSrtSection && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-emerald-300">{text.srtOutputLabel}</h2>
                <button
                  type="button"
                  onClick={() => setIsSrtVisible((prev) => !prev)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-sky-400 hover:text-white"
                >
                  {isSrtVisible ? text.collapse : text.expand}
                </button>
              </div>
              {isSrtVisible && (
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <pre className="max-h-72 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-100">
                    {displaySrt}
                  </pre>
                </div>
              )}
            </section>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!canInteractWithSrt}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition ${
                canInteractWithSrt
                  ? 'border border-sky-500/60 bg-sky-500/20 text-sky-100 hover:border-sky-400 hover:bg-sky-500/30 hover:text-white'
                  : 'cursor-not-allowed border border-white/5 bg-white/5 text-slate-500'
              }`}
            >
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125V17.25m0 0v1.125c0 .621.504 1.125 1.125 1.125h1.5v-2.25"
                />
              </svg>
              {text.copySrt}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!canInteractWithSrt}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition ${
                canInteractWithSrt
                  ? 'border border-emerald-500/60 bg-emerald-500/15 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/25 hover:text-white'
                  : 'cursor-not-allowed border border-white/5 bg-white/5 text-slate-500'
              }`}
            >
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              {text.downloadSrt}
            </button>
          </div>
        </div>
      </div>

      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-2xl px-5 py-3 text-sm font-medium shadow-lg transition ${
            notification.type === 'success'
              ? 'bg-emerald-500/90 text-white'
              : 'bg-rose-500/90 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}

      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-300">
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-white">{text.errorTitle}</h3>
            </div>
            <p className="text-sm text-slate-200">{errorMessage}</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-400 hover:text-white"
              >
                {text.closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
