import {
  javaIndent,
  javaSafeName,
  javaString,
} from './java-generator-utils';

function javaValue(block, inputName, fallback = '0') {
  const target = block?.getInputTargetBlock?.(inputName);
  return target ? javaBlockToValue(target) : fallback;
}

function javaStatements(block, inputName) {
  const target = block?.getInputTargetBlock?.(inputName);
  return target ? javaBlockToStatements(target) : '';
}

function javaVariableName(block, fieldName = 'VAR') {
  const field = block?.getField?.(fieldName);
  return javaSafeName(field?.getText?.() || block?.getFieldValue?.(fieldName) || 'value');
}

function javaProcedureCallArgs(block) {
  const args = Array.isArray(block?.arguments_) ? block.arguments_ : [];
  return args.map((_, index) => javaValue(block, `ARG${index}`, 'null'));
}

export function javaBlockToValue(block) {
  if (!block) {
    return '0';
  }

  switch (block.type) {
    case 'math_number':
      return String(Number(block.getFieldValue('NUM') || 0));
    case 'text':
      return javaString(block.getFieldValue('TEXT') || '');
    case 'logic_boolean':
      return block.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false';
    case 'logic_null':
      return 'null';
    case 'variables_get':
      return javaVariableName(block);
    case 'math_arithmetic': {
      const op = { ADD: '+', MINUS: '-', MULTIPLY: '*', DIVIDE: '/', POWER: null }[block.getFieldValue('OP')];
      const left = javaValue(block, 'A');
      const right = javaValue(block, 'B');
      return op ? `(${left} ${op} ${right})` : `Math.pow(${left}, ${right})`;
    }
    case 'math_modulo':
      return `(${javaValue(block, 'DIVIDEND')} % ${javaValue(block, 'DIVISOR', '1')})`;
    case 'logic_compare': {
      const op = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' }[block.getFieldValue('OP')] || '==';
      return `(${javaValue(block, 'A')} ${op} ${javaValue(block, 'B')})`;
    }
    case 'logic_operation': {
      const op = block.getFieldValue('OP') === 'AND' ? '&&' : '||';
      return `(${javaValue(block, 'A', 'false')} ${op} ${javaValue(block, 'B', 'false')})`;
    }
    case 'logic_negate':
      return `(!${javaValue(block, 'BOOL', 'false')})`;
    case 'logic_ternary':
      return `(${javaValue(block, 'IF', 'false')} ? ${javaValue(block, 'THEN', '0')} : ${javaValue(block, 'ELSE', '0')})`;
    case 'text_join': {
      const count = Number(block.itemCount_ || 0);
      const parts = Array.from({ length: count }, (_, index) => javaValue(block, `ADD${index}`, '""'));
      return parts.length ? parts.join(' + ') : '""';
    }
    case 'text_length':
      return `${javaValue(block, 'VALUE', '""')}.length()`;
    case 'text_isEmpty':
      return `${javaValue(block, 'VALUE', '""')}.isEmpty()`;
    case 'text_prompt_ext':
      return block.getFieldValue('TYPE') === 'NUMBER'
        ? 'Integer.parseInt(__h5pScanner.nextLine())'
        : '__h5pScanner.nextLine()';
    case 'lists_create_empty':
      return 'new java.util.ArrayList<>()';
    case 'lists_create_with': {
      const count = Number(block.itemCount_ || 0);
      const parts = Array.from({ length: count }, (_, index) => javaValue(block, `ADD${index}`, 'null'));
      return `java.util.Arrays.asList(${parts.join(', ')})`;
    }
    case 'lists_length':
      return `${javaValue(block, 'VALUE', 'java.util.List.of()')}.size()`;
    case 'lists_isEmpty':
      return `${javaValue(block, 'VALUE', 'java.util.List.of()')}.isEmpty()`;
    case 'procedures_callreturn':
      return `${javaSafeName(block.getFieldValue('NAME'))}(${javaProcedureCallArgs(block).join(', ')})`;
    default:
      return `unsupportedBlock(${javaString(block.type || 'unknown')})`;
  }
}

export function javaBlockToStatement(block) {
  switch (block?.type) {
    case 'text_print':
      return `System.out.println(${javaValue(block, 'TEXT', '""')});\n`;
    case 'variables_set':
      return `var ${javaVariableName(block)} = ${javaValue(block, 'VALUE')};\n`;
    case 'math_change':
      return `${javaVariableName(block)} += ${javaValue(block, 'DELTA', '1')};\n`;
    case 'text_append':
      return `${javaVariableName(block)} += ${javaValue(block, 'TEXT', '""')};\n`;
    case 'controls_if': {
      let code = '';
      for (let index = 0; index <= Number(block.elseifCount_ || 0); index++) {
        const keyword = index === 0 ? 'if' : 'else if';
        code += `${keyword} (${javaValue(block, `IF${index}`, 'false')}) {\n${javaIndent(javaStatements(block, `DO${index}`))}\n}`;
      }
      if (block.elseCount_) {
        code += ` else {\n${javaIndent(javaStatements(block, 'ELSE'))}\n}`;
      }
      return `${code}\n`;
    }
    case 'controls_repeat_ext': {
      const loopVar = `count_${block.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      return `for (int ${loopVar} = 0; ${loopVar} < ${javaValue(block, 'TIMES', '0')}; ${loopVar}++) {\n${javaIndent(javaStatements(block, 'DO'))}\n}\n`;
    }
    case 'controls_whileUntil': {
      const condition = javaValue(block, 'BOOL', 'false');
      const test = block.getFieldValue('MODE') === 'UNTIL' ? `!(${condition})` : condition;
      return `while (${test}) {\n${javaIndent(javaStatements(block, 'DO'))}\n}\n`;
    }
    case 'controls_for': {
      const variable = javaVariableName(block);
      return `for (int ${variable} = ${javaValue(block, 'FROM', '0')}; ${variable} <= ${javaValue(block, 'TO', '0')}; ${variable} += ${javaValue(block, 'BY', '1')}) {\n${javaIndent(javaStatements(block, 'DO'))}\n}\n`;
    }
    case 'controls_flow_statements':
      return `${block.getFieldValue('FLOW') === 'BREAK' ? 'break' : 'continue'};\n`;
    case 'procedures_callnoreturn':
      return `${javaSafeName(block.getFieldValue('NAME'))}(${javaProcedureCallArgs(block).join(', ')});\n`;
    case 'procedures_defnoreturn':
    case 'procedures_defreturn':
      return '';
    default:
      return `unsupportedBlock(${javaString(block?.type || 'unknown')});\n`;
  }
}

export function javaBlockToStatements(block) {
  let code = '';
  let current = block;
  while (current) {
    code += javaBlockToStatement(current);
    current = current.getNextBlock?.() || null;
  }
  return code;
}

function javaProcedureArgs(block) {
  const args = Array.isArray(block?.arguments_) ? block.arguments_ : [];
  return args.map((name) => `Object ${javaSafeName(name)}`);
}

export function javaProcedureDefinitions(topBlocks) {
  return topBlocks
    .filter((block) => ['procedures_defnoreturn', 'procedures_defreturn'].includes(block.type))
    .map((block) => {
      const name = javaSafeName(block.getFieldValue('NAME'));
      const args = javaProcedureArgs(block).join(', ');
      const body = javaStatements(block, 'STACK');
      if (block.type === 'procedures_defreturn') {
        return [`private static Object ${name}(${args}) {`, javaIndent(body, 8), `        return ${javaValue(block, 'RETURN', 'null')};`, '    }'].join('\n');
      }
      return [`private static void ${name}(${args}) {`, javaIndent(body, 8), '    }'].join('\n');
    })
    .join('\n\n');
}
