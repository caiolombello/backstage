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
import React, { useState } from 'react';
import { Typography, Button, TextField } from '@material-ui/core';
import { makeStyles, Theme } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChatIcon from '@material-ui/icons/Chat';

const useStyles = makeStyles((theme: Theme) => ({
  chatContainer: {
    position: 'fixed',
    bottom: `${theme.spacing(2)}px`,
    right: `${theme.spacing(2)}px`,
    width: '300px',
    height: '48px',
    borderLeft: `1px solid ${theme.palette.divider}`,
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    transition: 'all 0.3s ease-in-out',
    zIndex: 1000,
    borderRadius: `${theme.shape.borderRadius}px`,
    display: 'flex',
    flexDirection: 'column',
  },
  chatExpanded: {
    width: '30%',
    height: 'calc(90vh - 64px)',
    bottom: '0',
    right: '0',
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${theme.spacing(1)}px ${theme.spacing(2)}px`,
  },
  chatContent: {
    height: '100%',
    overflowY: 'auto',
    padding: `${theme.spacing(2)}px`,
  },
  chatInput: {
    display: 'flex',
    padding: `${theme.spacing(2)}px`,
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  chatTextField: {
    flex: '1',
    marginRight: `${theme.spacing(2)}px`,
  },
  chatButton: {
    width: '100%',
    marginTop: '-3px',
  },
}));

export const AIChatComponent: React.FC<{
  containerStyle?: React.CSSProperties;
}> = ({ containerStyle }) => {
  const classes = useStyles();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ text: string; sender: 'user' | 'ai' }>
  >([]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { text: input, sender: 'user' }]);
      // Aqui você adicionaria a lógica para enviar a mensagem para a API de IA
      setInput('');
      // Simular resposta da IA
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { text: 'Resposta simulada da IA', sender: 'ai' },
        ]);
      }, 1000);
    }
  };

  return (
    <Paper
      className={`${classes.chatContainer} ${
        isOpen ? classes.chatExpanded : ''
      }`}
      elevation={3}
      style={containerStyle}
    >
      <div className={classes.chatHeader}>
        <Button
          onClick={() => setIsOpen(!isOpen)}
          startIcon={<ChatIcon />}
          endIcon={isOpen ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          className={classes.chatButton}
        >
          Chat IA
        </Button>
      </div>
      {isOpen && (
        <>
          <div className={classes.chatContent}>
            {messages.map((msg, index) => (
              <Typography
                key={index}
                align={msg.sender === 'user' ? 'right' : 'left'}
              >
                <strong>{msg.sender === 'user' ? 'Você' : 'IA'}:</strong>{' '}
                {msg.text}
              </Typography>
            ))}
          </div>
          <div className={classes.chatInput}>
            <TextField
              className={classes.chatTextField}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              variant="outlined"
              size="small"
            />
            <Button onClick={handleSend} variant="contained" color="primary">
              Enviar
            </Button>
          </div>
        </>
      )}
    </Paper>
  );
};
