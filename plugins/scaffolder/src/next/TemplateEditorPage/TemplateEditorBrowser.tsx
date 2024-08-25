/*
 * Copyright 2022 The Backstage Authors
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
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import { makeStyles } from '@material-ui/core/styles';
import CloseIcon from '@material-ui/icons/Close';
import RefreshIcon from '@material-ui/icons/Refresh';
import SaveIcon from '@material-ui/icons/Save';
import ChatIcon from '@material-ui/icons/Chat';
import React, { useState } from 'react';
import { useDirectoryEditor } from './DirectoryEditorContext';
import { FileBrowser } from '../../components/FileBrowser';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { scaffolderTranslationRef } from '../../translation';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

const useStyles = makeStyles(theme => ({
  button: {
    padding: theme.spacing(1),
  },
  buttons: {
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  buttonsGap: {
    flex: '1 1 auto',
  },
  buttonsDivider: {
    marginBottom: theme.spacing(1),
  },
  root: {
    display: 'flex',
    height: '100%',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  chatContainer: {
    position: 'fixed',
    bottom: theme.spacing(2),
    right: theme.spacing(2),
    width: '300px',
    height: '48px',
    borderLeft: `1px solid ${theme.palette.divider}`,
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    transition: 'all 0.3s ease-in-out',
    zIndex: 1000,
    borderRadius: theme.shape.borderRadius,
    display: 'flex',
    flexDirection: 'column',
  },
  chatExpanded: {
    width: '30%',
    height: 'calc(95vh - 64px)',
    bottom: 0,
    right: 0,
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 2),
  },
  chatContent: {
    height: '100%',
    overflowY: 'auto',
    padding: theme.spacing(2),
  },
  chatInput: {
    display: 'flex',
    padding: theme.spacing(2),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  chatTextField: {
    flex: 1,
    marginRight: theme.spacing(2),
  },
}));

/** The local file browser for the template editor */
export function TemplateEditorBrowser(props: { onClose?: () => void }) {
  const classes = useStyles();
  const directoryEditor = useDirectoryEditor();
  const changedFiles = directoryEditor.files.filter(file => file.dirty);
  const { t } = useTranslationRef(scaffolderTranslationRef);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ text: string; sender: 'user' | 'ai' }>
  >([]);
  const [chatInput, setChatInput] = useState('');

  const handleClose = () => {
    if (!props.onClose) {
      return;
    }
    if (changedFiles.length > 0) {
      // eslint-disable-next-line no-alert
      const accepted = window.confirm(
        t('templateEditorPage.templateEditorBrowser.closeConfirmMessage'),
      );
      if (!accepted) {
        return;
      }
    }
    props.onClose();
  };

  const toggleChat = () => setIsChatOpen(!isChatOpen);

  const sendChatMessage = () => {
    if (chatInput.trim()) {
      setChatMessages([...chatMessages, { text: chatInput, sender: 'user' }]);
      setChatInput('');
      // Aqui você chamaria a API do assistente de IA
      // Por enquanto, vamos simular uma resposta
      setTimeout(() => {
        setChatMessages(prev => [
          ...prev,
          { text: 'Resposta simulada do assistente de IA', sender: 'ai' },
        ]);
      }, 1000);
    }
  };

  return (
    <>
      <div className={classes.root}>
        <div className={classes.content}>
          <div className={classes.buttons}>
            <Tooltip
              title={t(
                'templateEditorPage.templateEditorBrowser.saveIconTooltip',
              )}
            >
              <IconButton
                className={classes.button}
                disabled={directoryEditor.files.every(file => !file.dirty)}
                onClick={() => directoryEditor.save()}
              >
                <SaveIcon />
              </IconButton>
            </Tooltip>
            <Tooltip
              title={t(
                'templateEditorPage.templateEditorBrowser.reloadIconTooltip',
              )}
            >
              <IconButton
                className={classes.button}
                onClick={() => directoryEditor.reload()}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <div className={classes.buttonsGap} />
            <Tooltip title={isChatOpen ? 'Fechar Chat' : 'Abrir Chat'}>
              <IconButton className={classes.button} onClick={toggleChat}>
                <ChatIcon />
              </IconButton>
            </Tooltip>
            <Tooltip
              title={t(
                'templateEditorPage.templateEditorBrowser.closeIconTooltip',
              )}
            >
              <IconButton className={classes.button} onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </div>
          <Divider className={classes.buttonsDivider} />
          <FileBrowser
            selected={directoryEditor.selectedFile?.path ?? ''}
            onSelect={directoryEditor.setSelectedFile}
            filePaths={directoryEditor.files.map(file => file.path)}
          />
        </div>
      </div>
      <Paper
        className={`${classes.chatContainer} ${
          isChatOpen ? classes.chatExpanded : ''
        }`}
        elevation={3}
      >
        <div className={classes.chatHeader}>
          <Button
            onClick={toggleChat}
            startIcon={<ChatIcon />}
            endIcon={isChatOpen ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          >
            Chat IA
          </Button>
        </div>
        {isChatOpen && (
          <>
            <div className={classes.chatContent}>
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    textAlign: msg.sender === 'user' ? 'right' : 'left',
                    marginBottom: '8px',
                  }}
                >
                  <strong>{msg.sender === 'user' ? 'Você' : 'IA'}:</strong>{' '}
                  {msg.text}
                </div>
              ))}
            </div>
            <div className={classes.chatInput}>
              <TextField
                className={classes.chatTextField}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Digite sua pergunta..."
                variant="outlined"
                size="small"
              />
              <Button
                variant="contained"
                color="primary"
                onClick={sendChatMessage}
              >
                Enviar
              </Button>
            </div>
          </>
        )}
      </Paper>
    </>
  );
}
