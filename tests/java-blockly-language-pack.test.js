import { describe, expect, it } from 'vitest';
import {
  validateBlocklyLanguagePack,
} from '../../H5P.LibCodeTools-6.0/src/scripts/editor/blockly/blockly-language-pack-contract.js';
import {
  JAVA_BLOCKLY_LANGUAGE_PACK,
} from '../src/scripts/blockly/java-blockly-language-pack.js';
import {
  generateJavaFromBlocklyWorkspace,
} from '../src/scripts/blockly/java-generator.js';

function block(type, {
  id = type,
  fields = {},
  inputs = {},
  next = null,
  itemCount = undefined,
  outputConnection = null,
} = {}) {
  return {
    type,
    id,
    itemCount_: itemCount,
    outputConnection,
    getFieldValue: (name) => fields[name],
    getField: (name) => fields[name] === undefined
      ? null
      : { getText: () => fields[name] },
    getInputTargetBlock: (name) => inputs[name] || null,
    getNextBlock: () => next,
  };
}

describe('Java Blockly language pack', () => {
  it('fulfills the shared language pack contract', () => {
    expect(validateBlocklyLanguagePack(JAVA_BLOCKLY_LANGUAGE_PACK)).toEqual([]);
  });

  it('generates Java main code with stdout and scanner input support', () => {
    const prompt = block('text_prompt_ext', {
      fields: { TYPE: 'TEXT' },
      inputs: {
        TEXT: block('text', { fields: { TEXT: 'Name?' }, outputConnection: {} }),
      },
      outputConnection: {},
    });
    const print = block('text_print', {
      inputs: { TEXT: prompt },
    });

    const code = generateJavaFromBlocklyWorkspace({
      getTopBlocks: () => [print],
    });

    expect(code).toContain('private static final java.util.Scanner __h5pScanner');
    expect(code).toContain('System.out.println(__h5pScanner.nextLine());');
  });

  it('keeps unsupported Blockly blocks explicit in generated Java', () => {
    const code = generateJavaFromBlocklyWorkspace({
      getTopBlocks: () => [block('unknown_block')],
    });

    expect(code).toContain('unsupportedBlock("unknown_block");');
    expect(code).toContain('private static <T> T unsupportedBlock(String blockType)');
  });

  it('generates H5P5 calls for shared graphics blocks', () => {
    const size = block('graphics_canvas_size', {
      inputs: {
        WIDTH: block('math_number', { fields: { NUM: 400 }, outputConnection: {} }),
        HEIGHT: block('math_number', { fields: { NUM: 300 }, outputConnection: {} }),
      },
      next: block('graphics_circle', {
        inputs: {
          X: block('math_number', { fields: { NUM: 200 }, outputConnection: {} }),
          Y: block('math_number', { fields: { NUM: 150 }, outputConnection: {} }),
          D: block('math_number', { fields: { NUM: 80 }, outputConnection: {} }),
        },
      }),
    });

    const code = generateJavaFromBlocklyWorkspace({
      getTopBlocks: () => [size],
    });

    expect(code).toContain('H5P5.createCanvas(400, 300);');
    expect(code).toContain('H5P5.circle(200, 150, 80);');
  });
});
