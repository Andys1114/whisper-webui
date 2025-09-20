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
            const detail = (errorData as any)?.error?.message;
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

        const segments = Array.isArray((transcription as any)?.segments)
          ? ((transcription as any).segments as Segment[])
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