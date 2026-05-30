import { javaIndent, javaSafeName } from './java-generator-utils';
import { blocklyProjectClassRegistry } from '../../../../H5P.LibCodeTools-6.0/src/scripts/editor/blockly/project-symbols';

const JAVA_OOP_BLOCK_TYPES = [
  'java_class_definition',
  'java_method_definition',
  'java_return',
  'java_declare_object',
  'java_new_object',
  'java_method_call_statement',
  'java_method_call_value',
];

function getClassOptions() {
  const classes = blocklyProjectClassRegistry.get('java');
  const names = [...new Set(classes.map((name) => javaSafeName(name)).filter(Boolean))];
  const options = names.length ? names : ['Helper'];

  return options.map((name) => [name, name]);
}

function registerBlock(Blockly, blockType, definition) {
  if (Blockly.Blocks[blockType]) {
    return;
  }

  Blockly.Blocks[blockType] = definition;
}

export function registerJavaOopBlocks(Blockly) {
  if (!Blockly?.Blocks || Blockly.__h5pJavaOopBlocksRegistered) {
    return;
  }

  registerBlock(Blockly, 'java_class_definition', {
    init() {
      this.appendDummyInput()
        .appendField('Klasse')
        .appendField(new Blockly.FieldTextInput('Helper'), 'CLASS_NAME');
      this.appendStatementInput('MEMBERS').appendField('Inhalt');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(25);
      this.setTooltip('Erzeugt eine Java-Klasse.');
    },
  });

  registerBlock(Blockly, 'java_method_definition', {
    init() {
      this.appendDummyInput()
        .appendField('Methode')
        .appendField(new Blockly.FieldDropdown([
          ['void', 'void'],
          ['int', 'int'],
          ['String', 'String'],
          ['boolean', 'boolean'],
          ['Object', 'Object'],
        ]), 'RETURN_TYPE')
        .appendField(new Blockly.FieldTextInput('answer'), 'METHOD_NAME')
        .appendField('()');
      this.appendStatementInput('BODY').appendField('mache');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(290);
      this.setTooltip('Erzeugt eine öffentliche Methode ohne Parameter.');
    },
  });

  registerBlock(Blockly, 'java_return', {
    init() {
      this.appendValueInput('VALUE').appendField('gib zurück');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(290);
      this.setTooltip('Return-Anweisung für Java-Methoden.');
    },
  });

  registerBlock(Blockly, 'java_declare_object', {
    init() {
      this.appendDummyInput()
        .appendField('Objekt')
        .appendField(new Blockly.FieldTextInput('helper'), 'VAR_NAME')
        .appendField('=')
        .appendField('neue')
        .appendField(new Blockly.FieldDropdown(getClassOptions), 'CLASS_NAME');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(210);
      this.setTooltip('Erzeugt ein Objekt aus einer anderen Klasse.');
    },
  });

  registerBlock(Blockly, 'java_new_object', {
    init() {
      this.appendDummyInput()
        .appendField('neue')
        .appendField(new Blockly.FieldDropdown(getClassOptions), 'CLASS_NAME');
      this.setOutput(true);
      this.setColour(210);
      this.setTooltip('Erzeugt ein neues Objekt.');
    },
  });

  registerBlock(Blockly, 'java_method_call_statement', {
    init() {
      this.appendDummyInput()
        .appendField('rufe')
        .appendField(new Blockly.FieldTextInput('helper'), 'OBJECT_NAME')
        .appendField('.')
        .appendField(new Blockly.FieldTextInput('answer'), 'METHOD_NAME')
        .appendField('(')
        .appendField(new Blockly.FieldTextInput(''), 'ARGS')
        .appendField(')');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(210);
      this.setTooltip('Ruft eine Methode eines Objekts auf.');
    },
  });

  registerBlock(Blockly, 'java_method_call_value', {
    init() {
      this.appendDummyInput()
        .appendField('Wert von')
        .appendField(new Blockly.FieldTextInput('helper'), 'OBJECT_NAME')
        .appendField('.')
        .appendField(new Blockly.FieldTextInput('answer'), 'METHOD_NAME')
        .appendField('(')
        .appendField(new Blockly.FieldTextInput(''), 'ARGS')
        .appendField(')');
      this.setOutput(true);
      this.setColour(210);
      this.setTooltip('Verwendet den Rückgabewert einer Objektmethode.');
    },
  });

  Blockly.__h5pJavaOopBlocksRegistered = true;
}

export function isJavaOopBlockType(blockType) {
  return JAVA_OOP_BLOCK_TYPES.includes(blockType);
}

export function javaOopBlockToStatement(block, helpers = {}) {
  const statements = typeof helpers.statements === 'function' ? helpers.statements : () => '';
  const value = typeof helpers.value === 'function' ? helpers.value : () => '0';

  switch (block?.type) {
    case 'java_class_definition': {
      const className = javaSafeName(block.getFieldValue('CLASS_NAME') || 'Helper');
      const members = statements(block.getInputTargetBlock?.('MEMBERS'));
      return `public class ${className} {\n${javaIndent(members, 4)}\n}\n`;
    }
    case 'java_method_definition': {
      const returnType = block.getFieldValue('RETURN_TYPE') || 'void';
      const methodName = javaSafeName(block.getFieldValue('METHOD_NAME') || 'method');
      const body = statements(block.getInputTargetBlock?.('BODY'));
      return `public ${returnType} ${methodName}() {\n${javaIndent(body, 4)}\n}\n`;
    }
    case 'java_return':
      return `return ${value(block.getInputTargetBlock?.('VALUE'))};\n`;
    case 'java_declare_object': {
      const className = javaSafeName(block.getFieldValue('CLASS_NAME') || 'Helper');
      const varName = javaSafeName(block.getFieldValue('VAR_NAME') || 'helper');
      return `${className} ${varName} = new ${className}();\n`;
    }
    case 'java_method_call_statement': {
      const objectName = javaSafeName(block.getFieldValue('OBJECT_NAME') || 'object');
      const methodName = javaSafeName(block.getFieldValue('METHOD_NAME') || 'method');
      const args = block.getFieldValue('ARGS') || '';
      return `${objectName}.${methodName}(${args});\n`;
    }
    default:
      return '';
  }
}

export function javaOopBlockToValue(block) {
  switch (block?.type) {
    case 'java_new_object': {
      const className = javaSafeName(block.getFieldValue('CLASS_NAME') || 'Helper');
      return `new ${className}()`;
    }
    case 'java_method_call_value': {
      const objectName = javaSafeName(block.getFieldValue('OBJECT_NAME') || 'object');
      const methodName = javaSafeName(block.getFieldValue('METHOD_NAME') || 'method');
      const args = block.getFieldValue('ARGS') || '';
      return `${objectName}.${methodName}(${args})`;
    }
    default:
      return '';
  }
}
