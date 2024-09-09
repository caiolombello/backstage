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
import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';
import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import express from 'express';
import Router from 'express-promise-router';
import fetch from 'node-fetch';

export interface RouterOptions {
  logger: LoggerService;
  config: RootConfigService;
}

interface OpenAIResponse {
  id: string;
  object: string;
  [key: string]: any;
}

async function fetchOpenAI(
  apiKey: string,
  endpoint: string,
  method: string,
  body?: any,
): Promise<OpenAIResponse> {
  try {
    const response = await fetch(`https://api.openai.com/v1${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return response.json();
  } catch (error) {
    console.error(`Erro na chamada à API OpenAI: ${error}`);
    throw error;
  }
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config } = options;
  const router = Router();
  router.use(express.json());

  const apiKey = config.getString('backend.openai.apiKey');
  let assistantId: string | null = null;

  async function getOrCreateAssistant(): Promise<string> {
    if (assistantId) return assistantId;

    try {
      logger.info('Obtendo ou criando assistente...');
      const assistants = await fetchOpenAI(apiKey, '/assistants', 'GET');
      const existingAssistant = assistants.data.find(
        (a: any) => a.name === 'VeeCode Platform AI',
      );

      if (existingAssistant) {
        logger.info(`Assistente existente encontrado: ${existingAssistant.id}`);
        assistantId = existingAssistant.id;
      } else {
        logger.info('Criando novo assistente...');
        const newAssistant = await fetchOpenAI(apiKey, '/assistants', 'POST', {
          name: 'VeeCode Platform AI',
          instructions:
            'Você é um assistente especializado na plataforma VeeCode.',
          model: 'gpt-4',
        });
        logger.info(`Novo assistente criado: ${newAssistant.id}`);
        assistantId = newAssistant.id;
      }

      return assistantId as string;
    } catch (error) {
      logger.error(`Erro ao criar/obter assistente: ${error}`);
      throw error;
    }
  }

  router.post('/start-chat', async (_req, res) => {
    try {
      logger.info('Iniciando chat...');
      const assistant = await getOrCreateAssistant();
      logger.info(`Assistente obtido: ${assistant}`);
      const thread = await fetchOpenAI(apiKey, '/threads', 'POST');
      logger.info(`Thread criada: ${thread.id}`);
      res.json({ threadId: thread.id, assistantId: assistant });
    } catch (error) {
      logger.error(`Erro ao iniciar chat: ${error}`);
      res.status(500).json({ error: `Erro ao iniciar chat: ${error.message}` });
    }
  });

  router.post('/chat', async (req, res) => {
    const { message, threadId, templateContent } = req.body;

    if (!threadId) {
      return res.status(400).json({ error: 'ThreadId é obrigatório' });
    }

    try {
      const assistant = await getOrCreateAssistant();

      // Adicionar mensagem à thread
      await fetchOpenAI(apiKey, `/threads/${threadId}/messages`, 'POST', {
        role: 'user',
        content: message,
      });

      // Criar e executar um run
      const run = await fetchOpenAI(
        apiKey,
        `/threads/${threadId}/runs`,
        'POST',
        {
          assistant_id: assistant,
          tools: [
            {
              type: 'retrieval',
            },
          ],
          additional_instructions: `Você é um assistente especializado na plataforma VeeCode. Você tem acesso ao conteúdo do template atual, que está disponível como contexto adicional. Use essas informações para fornecer respostas mais precisas e relevantes. Conteúdo do template:\n\n${templateContent}`,
        },
      );

      // Aguardar a conclusão do run
      let runStatus = await fetchOpenAI(
        apiKey,
        `/threads/${threadId}/runs/${run.id}`,
        'GET',
      );
      while (runStatus.status !== 'completed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await fetchOpenAI(
          apiKey,
          `/threads/${threadId}/runs/${run.id}`,
          'GET',
        );
      }

      // Obter as mensagens mais recentes
      const messages = await fetchOpenAI(
        apiKey,
        `/threads/${threadId}/messages`,
        'GET',
      );
      const latestMessage = messages.data[0];

      return res.json({ content: latestMessage.content[0].text.value });
    } catch (error) {
      logger.error(`Erro ao processar chat: ${error}`);
      return res.status(500).json({ error: 'Erro ao processar chat' });
    }
  });

  const middleware = MiddlewareFactory.create({ logger, config });
  router.use(middleware.error());
  return router;
}
