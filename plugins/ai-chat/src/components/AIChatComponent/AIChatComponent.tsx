/*
 * Copyright 2024 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Typography,
  Button,
  TextField,
  IconButton,
  Avatar,
  Tooltip,
  Paper,
} from '@material-ui/core';
import { makeStyles, Theme } from '@material-ui/core/styles';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChatIcon from '@material-ui/icons/Chat';
import SendIcon from '@material-ui/icons/Send';
import CloseIcon from '@material-ui/icons/Close';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useApi, errorApiRef } from '@backstage/core-plugin-api';

interface DirectoryEditorFile {
  path: string;
  content: string;
}

interface DirectoryEditor {
  files: DirectoryEditorFile[];
}

const useStyles = makeStyles((theme: Theme) => ({
  chatContainer: {
    position: 'fixed',
    bottom: theme.spacing(2),
    right: theme.spacing(2),
    width: '300px',
    height: '48px',
    backgroundColor: theme.palette.background.paper,
    transition: 'all 0.3s ease-in-out',
    zIndex: 1000,
    borderRadius: theme.shape.borderRadius,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: theme.shadows[3],
    overflow: 'hidden',
  },
  chatExpanded: {
    width: '400px',
    height: '600px',
  },
  chatFullscreen: {
    width: '80%',
    height: '80%',
    maxWidth: '1200px',
    maxHeight: '800px',
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
  headerActions: {
    display: 'flex',
    gap: theme.spacing(1),
  },
  chatContent: {
    flexGrow: 1,
    overflowY: 'auto',
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
  },
  chatInput: {
    display: 'flex',
    padding: theme.spacing(2),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  chatTextField: {
    flex: 1,
    marginRight: theme.spacing(1),
  },
  message: {
    maxWidth: '80%',
    padding: theme.spacing(1, 2),
    borderRadius: 16,
    marginBottom: theme.spacing(1),
    wordBreak: 'break-word',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: theme.palette.grey[200],
    color: 'black',
  },
  avatar: {
    width: 32,
    height: 32,
    marginRight: theme.spacing(1),
  },
  messageContainer: {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: theme.spacing(1),
  },
  closeButton: {
    padding: 0,
    color: theme.palette.primary.contrastText,
  },
  sendButton: {
    padding: theme.spacing(1),
  },
  codeBlock: {
    position: 'relative',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  copyButton: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: theme.palette.common.white,
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
  },
}));

interface Message {
  text: string;
  sender: 'user' | 'ai';
  isCode?: boolean;
}

export const AIChatComponent: React.FC<{
  containerStyle?: React.CSSProperties;
  directoryEditor: DirectoryEditor;
}> = ({ containerStyle, directoryEditor }) => {
  const classes = useStyles();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const errorApi = useApi(errorApiRef);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const callOpenAI = useCallback(
    async (message: string) => {
      setIsLoading(true);
      try {
        const templateContent = directoryEditor.files
          .map((file: DirectoryEditorFile) => `${file.path}:\n${file.content}`)
          .join('\n\n');

        let currentThreadId = threadId;
        if (!currentThreadId) {
          const response = await fetch('/api/ai-chat/start-chat', {
            method: 'POST',
          });
          if (!response.ok) {
            throw new Error(`Falha ao iniciar chat: ${response.statusText}`);
          }
          const data = await response.json();
          currentThreadId = data.threadId;
          setThreadId(currentThreadId);
        }

        const response = await fetch('/api/ai-chat/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            threadId: currentThreadId,
            templateContent,
          }),
        });

        if (!response.ok) {
          throw new Error(`Falha na chamada da API: ${response.statusText}`);
        }

        const data = await response.json();
        return data.content;
      } catch (error) {
        errorApi.post(new Error(`Erro ao processar solicitação: ${error}`));
        return `Desculpe, ocorreu um erro ao processar sua solicitação: ${error.message}`;
      } finally {
        setIsLoading(false);
      }
    },
    [directoryEditor, threadId, errorApi],
  );

  const handleSend = useCallback(async () => {
    if (input.trim()) {
      addMessage({ text: input, sender: 'user' });
      setInput('');

      const aiResponse = await callOpenAI(input);
      addMessage({ text: aiResponse, sender: 'ai' });
    }
  }, [input, addMessage, callOpenAI]);

  const handleCopyCode = useCallback((code: string) => {
    window.navigator.clipboard.writeText(code);
  }, []);

  const handleChatToggle = useCallback(() => {
    if (isFullscreen) {
      document
        .exitFullscreen()
        .catch(() => {
          // Ignora o erro se não estiver em tela cheia
        })
        .finally(() => {
          setIsFullscreen(false);
          setIsOpen(!isOpen);
        });
    } else {
      setIsOpen(!isOpen);
    }
  }, [isFullscreen, isOpen]);

  const handleFullscreenToggle = useCallback(() => {
    if (isFullscreen) {
      document
        .exitFullscreen()
        .catch(() => {
          // Ignora o erro se não estiver em tela cheia
        })
        .finally(() => {
          setIsFullscreen(false);
        });
    } else {
      const chatElement = document.getElementById('chat-container');
      if (chatElement) {
        chatElement
          .requestFullscreen()
          .then(() => {
            setIsFullscreen(true);
          })
          .catch(() => {
            // Ignora o erro se não puder entrar em tela cheia
          });
      }
    }
  }, [isFullscreen]);

  const handleClose = useCallback(() => {
    if (isFullscreen) {
      document
        .exitFullscreen()
        .catch(() => {
          // Ignora o erro se não estiver em tela cheia
        })
        .finally(() => {
          setIsFullscreen(false);
          setIsOpen(false);
        });
    } else {
      setIsOpen(false);
    }
  }, [isFullscreen]);

  const renderMessage = useCallback(
    (msg: Message, index: number) => (
      <div key={index} className={classes.messageContainer}>
        {msg.sender === 'ai' && (
          <Avatar
            className={classes.avatar}
            src="/placeholder.svg?height=32&width=32"
          >
            AI
          </Avatar>
        )}
        <div
          className={`${classes.message} ${
            msg.sender === 'user' ? classes.userMessage : classes.aiMessage
          }`}
        >
          {msg.isCode ? (
            <div className={classes.codeBlock}>
              <SyntaxHighlighter
                language="javascript"
                style={materialDark}
                customStyle={{ maxHeight: '300px', overflow: 'auto' }}
              >
                {msg.text}
              </SyntaxHighlighter>
              <IconButton
                className={classes.copyButton}
                onClick={() => handleCopyCode(msg.text)}
                size="small"
              >
                <FileCopyIcon fontSize="small" />
              </IconButton>
            </div>
          ) : (
            <Typography variant="body2">{msg.text}</Typography>
          )}
        </div>
      </div>
    ),
    [classes, handleCopyCode],
  );

  return (
    <Paper
      id="chat-container"
      className={`${classes.chatContainer} ${
        isOpen ? classes.chatExpanded : ''
      } ${isFullscreen ? classes.chatFullscreen : ''}`}
      elevation={3}
      style={containerStyle}
    >
      <div className={classes.chatHeader}>
        <Button
          onClick={handleChatToggle}
          startIcon={<ChatIcon />}
          endIcon={isOpen ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          color="inherit"
        >
          Chat IA
        </Button>
        {isOpen && (
          <div className={classes.headerActions}>
            <Tooltip title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}>
              <IconButton
                className={classes.closeButton}
                onClick={handleFullscreenToggle}
              >
                <FullscreenIcon />
              </IconButton>
            </Tooltip>
            <IconButton className={classes.closeButton} onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </div>
        )}
      </div>
      {isOpen && (
        <>
          <div className={classes.chatContent}>
            {messages.map((msg, index) => renderMessage(msg, index))}
            {isLoading && <Typography>Carregando resposta...</Typography>}
            <div ref={messagesEndRef} />
          </div>
          <div className={classes.chatInput}>
            <TextField
              className={classes.chatTextField}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Digite sua mensagem..."
              variant="outlined"
              size="small"
              multiline
              maxRows={3}
              disabled={isLoading}
            />
            <IconButton
              className={classes.sendButton}
              onClick={handleSend}
              color="primary"
              disabled={!input.trim() || isLoading}
            >
              <SendIcon />
            </IconButton>
          </div>
        </>
      )}
    </Paper>
  );
};
