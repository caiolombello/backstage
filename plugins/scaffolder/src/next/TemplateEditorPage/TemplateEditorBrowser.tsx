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
import React from 'react';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import { makeStyles, Theme } from '@material-ui/core/styles';
import CloseIcon from '@material-ui/icons/Close';
import RefreshIcon from '@material-ui/icons/Refresh';
import SaveIcon from '@material-ui/icons/Save';
import { useDirectoryEditor } from './DirectoryEditorContext';
import { FileBrowser } from '../../components/FileBrowser';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { scaffolderTranslationRef } from '../../translation';
import { AIChatComponent } from '@backstage/plugin-ai-chat';

const useStyles = makeStyles((theme: Theme) => ({
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
  browserContainer: {
    display: 'flex',
    flexDirection: 'row',
    height: 'calc(100% - 48px)',
    position: 'relative',
  },
  fileBrowser: {
    flex: 1,
  },
  chatComponent: {
    position: 'absolute',
    bottom: theme.spacing(2),
    right: theme.spacing(2),
    zIndex: 1000,
  },
}));

/** The local file browser for the template editor */
export function TemplateEditorBrowser(props: { onClose?: () => void }) {
  const classes = useStyles();
  const directoryEditor = useDirectoryEditor();
  const { t } = useTranslationRef(scaffolderTranslationRef);

  const changedFiles = directoryEditor.files.filter(file => file.dirty);
  const hasChangedFiles = changedFiles.length > 0;
  const canSave = directoryEditor.files.some(file => file.dirty);

  const handleSave = () => directoryEditor.save();
  const handleReload = () => directoryEditor.reload();

  const handleClose = () => {
    if (!props.onClose) return;

    if (hasChangedFiles) {
      // eslint-disable-next-line no-alert
      const accepted = window.confirm(
        t('templateEditorPage.templateEditorBrowser.closeConfirmMessage'),
      );
      if (!accepted) return;
    }
    props.onClose();
  };

  const handleFileSelect = (path: string) =>
    directoryEditor.setSelectedFile(path);

  return (
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
              disabled={!canSave}
              onClick={handleSave}
            >
              <SaveIcon />
            </IconButton>
          </Tooltip>
          <Tooltip
            title={t(
              'templateEditorPage.templateEditorBrowser.reloadIconTooltip',
            )}
          >
            <IconButton className={classes.button} onClick={handleReload}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <div className={classes.buttonsGap} />
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
        <div className={classes.browserContainer}>
          <div className={classes.fileBrowser}>
            <FileBrowser
              selected={directoryEditor.selectedFile?.path ?? ''}
              onSelect={handleFileSelect}
              filePaths={directoryEditor.files.map(file => file.path)}
            />
          </div>
          <div className={classes.chatComponent}>
            <AIChatComponent directoryEditor={directoryEditor} />
          </div>
        </div>
      </div>
    </div>
  );
}
