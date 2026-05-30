import {
  buildGraphicsCategory,
  registerGraphicsBlocks,
} from '../../../../H5P.LibCodeTools-6.0/src/scripts/editor/blockly/graphics-blocks';

function javaValue(block, generator, inputName, fallback = '0') {
  const target = block?.getInputTargetBlock?.(inputName);
  return target ? generator.value(target) : fallback;
}

function h5p5Call(name, args = []) {
  return `H5P5.${name}(${args.join(', ')});\n`;
}

/**
 * Wires the shared graphics Blockly blocks to Java's H5P5 facade.
 *
 * The block definitions live in LibCodeTools so other languages can reuse the
 * same authoring surface. This adapter only decides what Java source each
 * graphics block emits.
 */
export class JavaGraphicsBlocks {
  /**
   * Registers shared graphics blocks with Blockly.
   * @param {object} Blockly Blockly runtime.
   * @returns {void}
   */
  registerBlocks(Blockly) {
    registerGraphicsBlocks(Blockly);
  }

  /**
   * Returns the shared graphics toolbox category.
   * @returns {object} Blockly category.
   */
  buildCategory() {
    return buildGraphicsCategory();
  }

  /**
   * Converts a graphics statement block to Java source.
   * @param {object} block Blockly block.
   * @param {object} generator Java generator adapter.
   * @returns {string} Java source.
   */
  toStatement(block, generator) {
    switch (block?.type) {
      case 'graphics_canvas_size':
        return h5p5Call('createCanvas', [
          javaValue(block, generator, 'WIDTH', '400'),
          javaValue(block, generator, 'HEIGHT', '300'),
        ]);
      case 'graphics_background':
        return h5p5Call('background', [
          javaValue(block, generator, 'R', '240'),
          javaValue(block, generator, 'G', '240'),
          javaValue(block, generator, 'B', '240'),
        ]);
      case 'graphics_fill':
        return h5p5Call('fill', [
          javaValue(block, generator, 'R', '40'),
          javaValue(block, generator, 'G', '120'),
          javaValue(block, generator, 'B', '220'),
        ]);
      case 'graphics_stroke':
        return h5p5Call('stroke', [
          javaValue(block, generator, 'R', '20'),
          javaValue(block, generator, 'G', '30'),
          javaValue(block, generator, 'B', '40'),
        ]);
      case 'graphics_stroke_weight':
        return h5p5Call('strokeWeight', [javaValue(block, generator, 'WEIGHT', '1')]);
      case 'graphics_no_stroke':
        return h5p5Call('noStroke');
      case 'graphics_circle':
        return h5p5Call('circle', [
          javaValue(block, generator, 'X', '0'),
          javaValue(block, generator, 'Y', '0'),
          javaValue(block, generator, 'D', '10'),
        ]);
      case 'graphics_rect':
        return h5p5Call('rect', [
          javaValue(block, generator, 'X', '0'),
          javaValue(block, generator, 'Y', '0'),
          javaValue(block, generator, 'WIDTH', '10'),
          javaValue(block, generator, 'HEIGHT', '10'),
        ]);
      case 'graphics_line':
        return h5p5Call('line', [
          javaValue(block, generator, 'X1', '0'),
          javaValue(block, generator, 'Y1', '0'),
          javaValue(block, generator, 'X2', '10'),
          javaValue(block, generator, 'Y2', '10'),
        ]);
      case 'graphics_text':
        return h5p5Call('text', [
          javaValue(block, generator, 'TEXT', '""'),
          javaValue(block, generator, 'X', '0'),
          javaValue(block, generator, 'Y', '0'),
        ]);
      default:
        return '';
    }
  }

  /**
   * Checks whether a block is one of the shared graphics blocks.
   * @param {string} type Blockly block type.
   * @returns {boolean} True if supported.
   */
  supports(type) {
    return String(type || '').startsWith('graphics_');
  }
}

export const javaGraphicsBlocks = new JavaGraphicsBlocks();

export function registerJavaGraphicsBlocks(Blockly) {
  javaGraphicsBlocks.registerBlocks(Blockly);
}

export function buildJavaGraphicsCategory() {
  return javaGraphicsBlocks.buildCategory();
}

export function isJavaGraphicsBlockType(type) {
  return javaGraphicsBlocks.supports(type);
}

export function javaGraphicsBlockToStatement(block, generator) {
  return javaGraphicsBlocks.toStatement(block, generator);
}

