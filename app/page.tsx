'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';

const translations = {
  zh: {
    uiLanguageTitle: '界面语言',
    pageTitle: 'Groq Whisper API 转 SRT',
    subtitle: '通过 Groq API 将音频文件转录并转换为 SRT 字幕格式。',
    apiKeyLabel: 'Groq API 密钥',
    apiKeyPlaceholder: '请输入您的 Groq API 密钥',
    modelLabel: '选择模型',
    modelOptionDefault: 'Whisper Large V3 (默认)',
    modelOptionTurbo: 'Whisper Large V3 Turbo',
    transcriptionLangLabel: '选择语言（可选）',
    autoDetect: '自动检测',
    uploadInstruction: '点击此处或 <span class="font-semibold text-sky-400">拖拽</span> 音频文件到这里上传',
    uploadHint: '(例如: .mp3, .wav, .m4a, .ogg, .flac, .opus)',
    clearBtn: '清空',
    transcribeBtn: '开始转录',
    selectedFile: '已选择:',
    transcribing: '正在转录音频，请稍候...',
    requestingTranscription: '正在请求 Groq API 进行转录...',
    transcribeSuccess: '音频转录成功并已转换为 SRT!',
    apiKeyRequired: '请输入您的 Groq API 密钥。',
    fileEmpty: '上传的音频文件为空，请选择一个有效的文件。',
    invalidAudioType: '请上传有效的音频文件 (例如: .mp3, .wav, .m4a 等)。',
    noFileSelected: '请先选择音频文件。',
    groqRequestFailed: 'Groq API 请求失败',
    unknownError: '未知错误',
    groqResponseInvalid: 'Groq API 响应格式不正确，未能找到字幕片段。',
    srtGenerationEmpty: '未能从转录结果中生成有效的 SRT 内容。',
    srtConversionFailed: 'SRT 转换失败。',
    apiCallError: '调用 Groq API 时出错',
    apiRequestFailedText: 'API 请求失败。',
    apiResponseErrorText: 'API 响应格式错误。',
    apiCallErrorText: 'API 调用出错。',
    noSubtitleData: '没有可转换的字幕数据。',
    srtOutputLabel: 'SRT 输出',
    srtPlaceholder: '这里将显示转换后的 SRT 内容...',
    collapse: '收起',
    expand: '展开',
    copySrt: '复制 SRT',
    downloadSrt: '下载 .srt',
    srtCopied: 'SRT 内容已复制到剪贴板！',
    noSrtToCopy: '没有可复制的 SRT 内容。',
    copyFailed: '复制失败: ',
    downloadStarted: 'SRT 文件已开始下载。',
    noContentToDownload: '没有可下载的内容。',
    contentCleared: '内容已清空。',
    errorTitle: '发生错误',
    closeBtn: '关闭',
  },
  en: {
    uiLanguageTitle: 'UI Language',
    pageTitle: 'Groq Whisper API to SRT',
    subtitle: 'Transcribe audio with the Groq API and convert it into SRT subtitles.',
    apiKeyLabel: 'Groq API Key',
    apiKeyPlaceholder: 'Enter your Groq API key',
    modelLabel: 'Select model',
    modelOptionDefault: 'Whisper Large V3 (default)',
    modelOptionTurbo: 'Whisper Large V3 Turbo',
    transcriptionLangLabel: 'Select language (optional)',
    autoDetect: 'Auto detect',
    uploadInstruction: 'Click here or <span class="font-semibold text-sky-400">drag</span> an audio file to upload',
    uploadHint: '(e.g., .mp3, .wav, .m4a, .ogg, .flac, .opus)',
    clearBtn: 'Clear',
    transcribeBtn: 'Transcribe',
    selectedFile: 'Selected:',
    transcribing: 'Transcribing audio, please wait...',
    requestingTranscription: 'Requesting Groq API transcription...',
    transcribeSuccess: 'Audio transcribed and converted to SRT!',
    apiKeyRequired: 'Please enter your Groq API key.',
    fileEmpty: 'Uploaded audio file is empty. Please select a valid file.',
    invalidAudioType: 'Please upload a valid audio file (e.g., .mp3, .wav, .m4a).',
    noFileSelected: 'Please select an audio file first.',
    groqRequestFailed: 'Groq API request failed',
    unknownError: 'Unknown error',
    groqResponseInvalid: 'Groq API response invalid; no segments found.',
    srtGenerationEmpty: 'Could not generate valid SRT content from transcription.',
    srtConversionFailed: 'SRT conversion failed.',
    apiCallError: 'Error calling Groq API',
    apiRequestFailedText: 'API request failed.',
    apiResponseErrorText: 'API response error.',
    apiCallErrorText: 'API call error.',
    noSubtitleData: 'No subtitle data to convert.',
    srtOutputLabel: 'SRT Output',
    srtPlaceholder: 'Converted SRT content will appear here...',
    collapse: 'Collapse',
    expand: 'Expand',
    copySrt: 'Copy SRT',
    downloadSrt: 'Download .srt',
    srtCopied: 'SRT content copied to clipboard!',
    noSrtToCopy: 'No SRT content to copy.',
    copyFailed: 'Copy failed: ',
    downloadStarted: 'SRT file download started.',
    noContentToDownload: 'No content to download.',
    contentCleared: 'Content cleared.',
    errorTitle: 'Error occurred',
    closeBtn: 'Close',
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

const API_KEY_STORAGE_KEY = 'groqApiKey';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions';

const ACCEPTED_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/mp3',
  'audio/x-m4a',
  'audio/m4a',
  'audio/ogg',
  'audio/flac',
  'audio/opus',
]);

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

function convertSegmentsToSrt(segments: Segment[]) {
  const blocks: string[] = [];

  segments.forEach((segment, index) => {
    if (
      typeof segment.start !== 'number' ||
      typeof segment.end !== 'number' ||
      typeof segment.text !== 'string'
    ) {
      return;
    }

    const start = formatTime(segment.start);
    const end = formatTime(segment.end);
    const text = segment.text.trim();

    if (!text) {
      return;
    }

    blocks.push(`${index + 1}\n${start} --> ${end}\n${text}`);
  });

  return blocks.join('\n\n');
}

export default function HomePage() {
  const [uiLanguage, setUiLanguage] = useState<Language>('zh');
  const text = useMemo(() => translations[uiLanguage], [uiLanguage]);

  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('whisper-large-v3');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [downloadName, setDownloadName] = useState('output');
  const [srtContent, setSrtContent] = useState('');
  const [statusKey, setStatusKey] = useState<TranslationKey | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSrtOpen, setIsSrtOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedKey = window.localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const browserLanguage = window.navigator.language?.toLowerCase() ?? '';
    setUiLanguage(browserLanguage.startsWith('zh') ? 'zh' : 'en');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (apiKey) {
      window.localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    } else {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }, [apiKey]);

  useEffect(() => {
    if (!notification) {
      return;
    }

    const timer = window.setTimeout(() => setNotification(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notification]);

  const statusText = statusKey ? text[statusKey] : '';
  const hasSrtContent = srtContent.trim().length > 0;

  const notify = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  }, []);

  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const transcribe = useCallback(
    async (fileOverride?: File) => {
      const file = fileOverride ?? pendingFile;

      if (!file) {
        setStatusKey(null);
        setErrorMessage(text.noFileSelected);
        notify(text.noFileSelected, 'error');
        return;
      }

      if (!apiKey.trim()) {
        setStatusKey(null);
        setErrorMessage(text.apiKeyRequired);
        notify(text.apiKeyRequired, 'error');
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      setSrtContent('');
      setStatusKey('requestingTranscription');

      try {
        const formData = new FormData();
        formData.append('file', file, file.name);
        formData.append('model', selectedModel);
        formData.append('response_format', 'verbose_json');
        if (selectedLanguage) {
          formData.append('language', selectedLanguage);
        }

        const response = await fetch(GROQ_ENDPOINT, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey.trim()}` },
          body: formData,
        });

        if (!response.ok) {
          let message = `${text.groqRequestFailed}: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.json();
            const detail = errorData?.error?.message;
            if (detail) {
              message += ` ${detail}`;
            }
          } catch {
            message += ` ${text.unknownError}`;
          }

          setErrorMessage(message);
          setStatusKey('apiRequestFailedText');
          notify(message, 'error');
          return;
        }

        setStatusKey('transcribing');
        const transcription = await response.json();

        const segments = Array.isArray(transcription?.segments)
          ? (transcription.segments as Segment[])
          : undefined;

        if (!segments || segments.length === 0) {
          setErrorMessage(text.groqResponseInvalid);
          setStatusKey('apiResponseErrorText');
          notify(text.groqResponseInvalid, 'error');
          return;
        }

        const srt = convertSegmentsToSrt(segments);
        if (!srt) {
          setErrorMessage(text.srtGenerationEmpty);
          setStatusKey('srtConversionFailed');
          notify(text.srtGenerationEmpty, 'error');
          return;
        }

        setSrtContent(`${srt}\n`);
        setStatusKey('transcribeSuccess');
        notify(text.transcribeSuccess, 'success');
      } catch (error) {
        const message = `${text.apiCallError}: ${(error as Error).message ?? ''}`;
        setErrorMessage(message);
        setStatusKey('apiCallErrorText');
        notify(message, 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey, notify, pendingFile, selectedLanguage, selectedModel, text],
  );

  const handleValidatedFile = useCallback(
    (file: File) => {
      if (file.size === 0) {
        setErrorMessage(text.fileEmpty);
        setStatusKey(null);
        notify(text.fileEmpty, 'error');
        resetFileInput();
        return;
      }

      const isAcceptedType =
        ACCEPTED_AUDIO_TYPES.has(file.type) || /\.(mp3|wav|m4a|ogg|flac|opus)$/i.test(file.name);

      if (!isAcceptedType) {
        setErrorMessage(text.invalidAudioType);
        setStatusKey(null);
        notify(text.invalidAudioType, 'error');
        resetFileInput();
        return;
      }

      setPendingFile(file);
      setSelectedFileName(file.name);
      const safeName = file.name.replace(/\.[^/.]+$/, '');
      setDownloadName(safeName || 'output');
      setStatusKey('requestingTranscription');
      void transcribe(file);
    },
    [notify, resetFileInput, text, transcribe],
  );

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void handleValidatedFile(file);
      }
    },
    [handleValidatedFile],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(false);
      const file = event.dataTransfer.files?.[0];
      if (file) {
        void handleValidatedFile(file);
      }
    },
    [handleValidatedFile],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragActive(false);
  }, []);

  const handleClear = useCallback(() => {
    setPendingFile(null);
    setSelectedFileName('');
    setDownloadName('output');
    setSrtContent('');
    setStatusKey(null);
    setErrorMessage(null);
    resetFileInput();
    notify(text.contentCleared, 'success');
  }, [notify, resetFileInput, text.contentCleared]);

  const handleManualTranscribe = useCallback(() => {
    void transcribe();
  }, [transcribe]);

  const handleCopy = useCallback(async () => {
    if (!hasSrtContent) {
      notify(text.noSrtToCopy, 'error');
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(srtContent);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = srtContent;
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
      notify(`${text.copyFailed}${(error as Error).message ?? ''}`, 'error');
    }
  }, [hasSrtContent, notify, srtContent, text.copyFailed, text.noSrtToCopy, text.srtCopied]);

  const handleDownload = useCallback(() => {
    if (!hasSrtContent) {
      notify(text.noContentToDownload, 'error');
      return;
    }

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${downloadName || 'output'}.srt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify(text.downloadStarted, 'success');
  }, [downloadName, hasSrtContent, notify, srtContent, text.downloadStarted, text.noContentToDownload]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-gradient-to-br from-sky-500/10 via-transparent to-emerald-500/10" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid bg-[size:32px_32px] opacity-60" />

      <div className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-8 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sky-300">
                <span className="text-3xl">🎧</span>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Groq Whisper
                </span>
              </div>
              <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
                <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                  {text.pageTitle}
                </span>
              </h1>
              <p className="max-w-xl text-sm text-slate-300 sm:text-base">{text.subtitle}</p>
            </div>

            <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-200 shadow-inner">
              <span className="hidden sm:inline">{text.uiLanguageTitle}</span>
              <select
                value={uiLanguage}
                onChange={(event) => setUiLanguage(event.target.value as Language)}
                className="cursor-pointer rounded-full bg-transparent text-sm font-medium text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>

          <div className="grid gap-6 text-sm text-slate-200 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                {text.apiKeyLabel}
              </span>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={text.apiKeyPlaceholder}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                {text.modelLabel}
              </span>
              <select
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                className="w-full cursor-pointer rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              >
                <option value="whisper-large-v3">{text.modelOptionDefault}</option>
                <option value="whisper-large-v3-turbo">{text.modelOptionTurbo}</option>
              </select>
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                {text.transcriptionLangLabel}
              </span>
              <select
                value={selectedLanguage}
                onChange={(event) => setSelectedLanguage(event.target.value)}
                className="w-full cursor-pointer rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
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
                : 'border-white/10 bg-slate-950/70 hover:border-sky-400/80 hover:bg-slate-900/80'
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
            <p className="text-sm text-slate-200" dangerouslySetInnerHTML={{ __html: text.uploadInstruction }} />
            <p className="mt-2 text-xs text-slate-500">{text.uploadHint}</p>
            {selectedFileName && (
              <p className="mt-4 text-xs font-medium text-slate-400">
                {text.selectedFile} {selectedFileName}
              </p>
            )}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-5 py-2.5 text-sm font-medium text-slate-100 transition hover:border-emerald-400 hover:bg-emerald-500/10 hover:text-white"
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

            <button
              type="button"
              onClick={handleManualTranscribe}
              disabled={isLoading || (!pendingFile && !selectedFileName)}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                isLoading || (!pendingFile && !selectedFileName)
                  ? 'cursor-not-allowed border border-white/10 bg-white/10 text-slate-500'
                  : 'border border-sky-500/60 bg-sky-500/20 text-sky-100 hover:border-sky-400 hover:bg-sky-500/30 hover:text-white'
              }`}
            >
              {isLoading ? (
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16 8 8 0 01-8-8z" />
                </svg>
              ) : (
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
                    d="M8 12h.008v.008H8V12zm4 0h.008v.008H12V12zm4 0h.008v.008H16V12zm-6 4h.008v.008H10V16zm4 0h.008v.008H14V16zm-2 4h.008v.008H12V20zM9 5V3.75A2.25 2.25 0 0111.25 1.5h1.5A2.25 2.25 0 0115 3.75V5M5.25 5h13.5A2.25 2.25 0 0121 7.25v11.5A2.25 2.25 0 0118.75 21H5.25A2.25 2.25 0 013 18.75V7.25A2.25 2.25 0 015.25 5z"
                  />
                </svg>
              )}
              {text.transcribeBtn}
            </button>
          </div>

          {(statusText || isLoading) && (
            <p className="text-center text-sm text-slate-400">
              {isLoading ? text.transcribing : statusText}
            </p>
          )}

          {errorMessage && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
              <svg
                className="mt-0.5 h-5 w-5"
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
              <span>{errorMessage}</span>
            </div>
          )}

          <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/70">
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                {text.srtOutputLabel}
              </h2>
              <button
                type="button"
                onClick={() => setIsSrtOpen((prev) => !prev)}
                className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-sky-400 hover:text-white"
              >
                {isSrtOpen ? text.collapse : text.expand}
              </button>
            </div>
            {isSrtOpen && (
              <div className="px-5 pb-5">
                <textarea
                  value={srtContent}
                  placeholder={text.srtPlaceholder}
                  readOnly
                  className="h-64 w-full resize-none rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm leading-relaxed text-slate-100 shadow-inner focus:outline-none"
                />
              </div>
            )}
          </section>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!hasSrtContent}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition ${
                hasSrtContent
                  ? 'border border-sky-500/60 bg-sky-500/20 text-sky-100 hover:border-sky-400 hover:bg-sky-500/30 hover:text-white'
                  : 'cursor-not-allowed border border-white/10 bg-white/10 text-slate-500'
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
              disabled={!hasSrtContent}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition ${
                hasSrtContent
                  ? 'border border-emerald-500/60 bg-emerald-500/15 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/25 hover:text-white'
                  : 'cursor-not-allowed border border-white/10 bg-white/10 text-slate-500'
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
    </main>
  );
}
