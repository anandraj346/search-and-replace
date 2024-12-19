import { __ } from '@wordpress/i18n';
import { search } from '@wordpress/icons';
import { dispatch, select } from '@wordpress/data';
import { useState, useEffect } from '@wordpress/element';
import { Modal, TextControl, ToggleControl, Button, Tooltip } from '@wordpress/components';

import '../styles/app.scss';

import { getAllowedBlocks, getBlockEditorIframe, isCaseSensitive, inContainer } from './utils';
import { Shortcut } from './shortcut';

/**
 * Search & Replace for Block Editor.
 *
 * This function returns a JSX component that comprises
 * the Tooltip, Search Icon, Modal & Shortcut.
 *
 * @since 1.0.0
 *
 * @returns {JSX.Element}
 */
const SearchReplaceForBlockEditor = (): JSX.Element => {
  const [replacements, setReplacements] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [replaceInput, setReplaceInput] = useState('');
  const [matches, setMatches] = useState(new Set());
  const [showMatches, setShowMatches] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [context, setContext] = useState(false);

  /**
   * Open Modal.
   *
   * @since 1.0.0
   *
   * @returns {void}
   */
  const openModal = (): void => {
    handleSelection();
    setIsModalVisible(true);
    setReplacements(0);
  }

  /**
   * Close Modal.
   *
   * @since 1.0.0
   *
   * @returns {void}
   */
  const closeModal = (): void => {
    setIsModalVisible(false);
    setSearchInput('');
    setReplaceInput('');
    setMatches(new Set());
    setReplacements(0);
  }

  const addMatchValue = (value) => {
    setMatches((prevValues) => {
      // Create a new Set by spreading the previous state and adding the new value
      const newSet = new Set(prevValues);
      newSet.add(value);
      return newSet;
    });
  };

  // Function to remove a value from the Set
  const removeMatchValue = (value) => {
    setMatches((prevValues) => {
      const newSet = new Set(prevValues);
      newSet.delete(value);
      return newSet;
    });
  };

  /**
   * On Selection.
   *
   * Populate the search field when the user selects
   * a text range in the Block Editor.
   *
   * @since 1.2.0
   *
   * @returns {void}
   */
  const handleSelection = (): void => {
    const selectedText: string = getBlockEditorIframe().getSelection().toString();
    const modalSelector: string = '.search-replace-modal';

    if (selectedText && !inContainer(modalSelector)) {
      setSearchInput(selectedText);
    }
  };

  /**
   * Listen for changes in Search Input & Case Sensitivity.
   *
   * By passing in a FALSY context to the replace callback, we only 
   * search for matched strings, we DO NOT replace matched strings.
   *
   * @since 1.3.0
   *
   * @returns {void}
   */
  useEffect(() => {
    replace(false);
  }, [searchInput, caseSensitive]);

  useEffect(() => {
    const event = new CustomEvent('stateChanged', { detail: {
      matchString: searchInput,
      caseSensitive: caseSensitive,
      showMatches: showMatches,
      matches: matches
    } });
    window.dispatchEvent(event);
  }, [showMatches, matches]);

  /**
   * Handle case sensitive toggle feature
   * to enable user perform case-sensitive search
   * and replacements.
   *
   * @since 1.1.0
   *
   * @param {boolean} newValue
   * @returns {void}
   */
  const handleCaseSensitive = (newValue: boolean): void => {
    setCaseSensitive( newValue );
  }

  /**
   * Handle the implementation for when the user
   * clicks the 'Replace' button.
   *
   * @since 1.0.0
   * @since 1.3.0 Pass in context param to determine if it is Search or Replace.
   *
   * @param {boolean} context True (Replace), False (Search).
   * @returns {void}
   */
  const replace = (context = false): void => {
    setContext(context);
    setReplacements(0);
    setMatches(new Set());

    if (!searchInput) {
      return;
    }

    //original regex: (?<!<[^>]*)${searchInput}(?<![^>]*<)
    //current regex: (?<!<[^>]*?)\\b${searchInput}\\b(?![^<]*?>)
    const pattern: RegExp = new RegExp(
      `(?<!<[^>]*?)\\b${searchInput}\\b(?![^<]*?>)`,
      isCaseSensitive() || caseSensitive ? 'g' : 'gi'
    );

    select('core/block-editor').getBlocks().forEach((element) => {
      recursivelyReplace(element, pattern, replaceInput, context);
    });
  };

  /**
   * Recursively traverse and replace the text in the
   * Block Editor with the user's text. Perform attribute update
   * on a case by case basis based on mutating attribute.
   *
   * @since 1.0.0
   * @since 1.0.1 Handle edge-cases for quote, pullquote & details block.
   * @since 1.3.0 Pass in context param to determine if it is Search or Replace.
   *
   * @param {Object} element Gutenberg editor block.
   * @param {RegExp} pattern Search pattern.
   * @param {string} text    Replace pattern.
   * @param {boolean} context True (Replace), False (Search).
   *
   * @returns {void}
   */
  const recursivelyReplace = (element, pattern, text, context): void => {
    if (getAllowedBlocks().indexOf(element.name) !== -1) {
      const args = { element, pattern, text, context };

      switch (element.name) {
        case 'core/quote':
        case 'core/pullquote':
          replaceBlockAttribute(args, 'citation');
          break;

        case 'core/details':
          replaceBlockAttribute(args, 'summary');
          break;
        
        case 'core/table':
          replaceTableContent(args);
          break;

        default:
          replaceBlockAttribute(args, 'content');
          break;
      }
    }

    if (element.innerBlocks.length) {
      element.innerBlocks.forEach((innerElement) => {
        recursivelyReplace(innerElement, pattern, text, context);
      });
    }
  }

  /**
   * Do the actual job of replacing the string
   * by dispatching the change using the block's clientId
   * as reference.
   *
   * @since 1.0.1
   *
   * @param {Object} args      Args object containing element, pattern and text.
   * @param {string} attribute The attribute to be mutated e.g. content.
   *
   * @returns {void}
   */
  const replaceBlockAttribute = (args, attribute): void => {
    const { attributes, clientId } = args.element;

    if (undefined === attributes || undefined === attributes[attribute]) {
      return;
    }

    let oldString: string = attributes[attribute].originalHTML || attributes[attribute];
    let newString: string = oldString.replace(args.pattern, () => {
      setReplacements((items) => items + 1);
      addMatchValue(oldString);
      return args.text;
    });

    if (newString === oldString) {
      return;
    }

    const property = {};
    property[attribute] = newString;

    if (args.context) {
      (dispatch('core/block-editor') as any)
      .updateBlockAttributes(clientId, property);
    }

    // Handle edge-case ('value') with Pullquotes.
    if (attributes.value) {
      if (args.context) {
        (dispatch('core/block-editor') as any)
        .updateBlockAttributes(clientId, { value: newString });  
      }
      setReplacements((items) => items + 1);
    }
  }

  /**
   * Do the actual job of replacing the string in table block
   * by dispatching the change using the block's clientId
   * as reference.
   *
   * @since 1.3.0
   *
   * @param {Object} args Args object containing element, pattern and text.
   *
   * @returns {void}
   */
  const replaceTableContent = (args) => {
    const { attributes, clientId } = args.element;

    // Handle Table Caption Replacement
    if (attributes && attributes.caption) {
      let oldCaptionString = attributes.caption.originalHTML || attributes.caption;
      let newCaptionString = oldCaptionString.replace(args.pattern, () => {
        setReplacements((items) => items + 1);
        addMatchValue(oldCaptionString);
        return args.text;
      });

      if (newCaptionString !== oldCaptionString) {
        const captionProperty = { caption: newCaptionString };

        if(args.context){
          (dispatch('core/block-editor') as any).
          updateBlockAttributes(clientId, captionProperty);
        }
      }
    }

    // Replace body cells content
    if (attributes.body) {
      const updatedBody = attributes.body.map(row => {
        if (row.cells) {

          row.cells = row.cells.map(cell => {
            if (cell.content || cell.content.originalHTML) {
              let oldCellContent = cell.content.originalHTML || cell.content;

              // const matches = oldCellContent.match(args.pattern);
              // if (matches) {
              //   setReplacements(prevItems => prevItems + matches.length);
              // }
    
              // Perform the actual replacement
              
              let newCellContent = oldCellContent.replace(args.pattern, () => {
                setReplacements((items) => items + 1);
                addMatchValue(oldCellContent);
                return args.text;
              });
              
              if ((newCellContent !== oldCellContent) && args.context) {
                cell.content = newCellContent;
              }
            }
            return cell;
          });
        }
        return row;
      });

      // If any cell content was updated, dispatch the update
      // if (JSON.stringify(updatedBody) !== JSON.stringify(attributes.body)) {
        const bodyProperty = { body: updatedBody };

        if(args.context){
          (dispatch('core/block-editor') as any).
          updateBlockAttributes(clientId, bodyProperty);
        }
      // }
    }

    // Replace head cells content
    if (attributes.head) {
      const updatedHead = attributes.head.map(row => {
        if (row.cells) {
          row.cells = row.cells.map(cell => {
            if (cell.content || cell.content.originalHTML) {
              let oldCellContent = cell.content.originalHTML || cell.content;
              let newCellContent = oldCellContent.replace(args.pattern, () => {
                setReplacements((items) => items + 1);
                addMatchValue(oldCellContent);
                return args.text;
              });

              if ((newCellContent !== oldCellContent) && args.context) {
                cell.content = newCellContent; 
              }
            }
            return cell;
          });
        }
        return row;
      });

      // If any head cell content was updated, dispatch the update
      // if (JSON.stringify(updatedHead) !== JSON.stringify(attributes.head)) {
        const headProperty = { head: updatedHead };

        if(args.context){
          (dispatch('core/block-editor') as any).
          updateBlockAttributes(clientId, headProperty);
        }
      // }
    }

    // Replace foot cells content
    if (attributes.foot) {
      const updatedFoot = attributes.foot.map(row => {
        if (row.cells) {
          row.cells = row.cells.map(cell => {
            if (cell.content || cell.content.originalHTML) {
              let oldCellContent = cell.content.originalHTML || cell.content;
              let newCellContent = oldCellContent.replace(args.pattern, () => {
                setReplacements((items) => items + 1);
                addMatchValue(oldCellContent);
                return args.text;
              });

              if ((newCellContent !== oldCellContent) && args.context) {
                cell.content = newCellContent; 
              }
            }
            return cell;
          });
        }
        return row;
      });

      // If any foot cell content was updated, dispatch the update
      // if (JSON.stringify(updatedFoot) !== JSON.stringify(attributes.foot)) {
        const footProperty = { foot: updatedFoot };

        if(args.context){
          (dispatch('core/block-editor') as any).
          updateBlockAttributes(clientId, footProperty);
        }
      // }
    }
  }
  
  /*
   * Listen for Selection.
   *
   * Constantly listen for when the user selects a
   * a text in the Block Editor.
   *
   * @since 1.2.0
   *
   * @returns {void}
   */
  useEffect(() => {
    const editor = getBlockEditorIframe();

    editor.addEventListener(
      'selectionchange', handleSelection
    );

    return () => {
      editor.removeEventListener(
        'selectionchange', handleSelection
      );
    };
  }, []);

  return (
    <>
      <Shortcut onKeyDown={openModal} />
      <Tooltip text={__('Search & Replace', 'search-replace-for-block-editor')}>
        <Button
          icon={ search }
          label={__('Search & Replace', 'search-replace-for-block-editor')}
          onClick={openModal}
        />
      </Tooltip>
      {
        isModalVisible && (
          <Modal
            title={__('Search & Replace', 'search-replace-for-block-editor')}
            onRequestClose={closeModal}
            shouldCloseOnClickOutside={false}
            className="search-replace-modal"
          >
            <div id="search-replace-modal__text-group">
              <TextControl
                type="text"
                label={__('Search')}
                value={searchInput}
                onChange={(value) => setSearchInput(value)}
                placeholder="Search text..."
                __nextHasNoMarginBottom
              />
              <TextControl
                type="text"
                label={__('Replace with')}
                value={replaceInput}
                onChange={(value) => setReplaceInput(value)}
                __nextHasNoMarginBottom
              />
            </div>

            <div id="search-replace-modal__toggle">
              <ToggleControl
                label={__('Match Case | Expression', 'search-replace-for-block-editor')}
                checked={caseSensitive}
                onChange={handleCaseSensitive}
                __nextHasNoMarginBottom
              />
            </div>

            {
              replacements ? (
                <div id="search-replace-modal__notification">
                  <p>
                    {context ? (
                      <>
                        <strong>{replacements}</strong> {__('item(s) replaced successfully', 'search-replace-for-block-editor')}.
                      </>
                    ) : (
                      <>
                        <strong>{replacements}</strong> {__('item(s) found', 'search-replace-for-block-editor')}.
                      </>
                    )}
                  </p>
                  {
                    !context ? (
                      <a href="javascript:void(0);" className="js-show-matches" onClick={() => setShowMatches(!showMatches)} >{showMatches ? 'Hide' : 'Show'}</a>
                    ) : ''
                  }
                </div>
              ) : ''
            }

            <div id="search-replace-modal__button-group">
              <Button
                variant="primary"
                onClick={() => replace(true)}
              >
                {__('Replace')}
              </Button>
              <Button
                variant="secondary"
                onClick={closeModal}
              >
                {__('Done')}
              </Button>
            </div>
          </Modal>
        )
      }
    </>
  );
};

export default SearchReplaceForBlockEditor;
