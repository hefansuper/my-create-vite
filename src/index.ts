/*
 * @Author: stephenHe
 * @Date: 2025-02-06 16:58:09
 * @LastEditors: stephenHe
 * @LastEditTime: 2025-02-06 17:05:35
 * @Description: 脚手架的入口文件
 * @FilePath: /my-create-vite/src/index.ts
 */

import chalk from "chalk";
import minimist from "minimist";

// 支持 help、template 两个选项，并且有别名 h 和 t
// 会生成一个对应的对象，命令行的参数都会被解析到这个对象中。别名的值是boolean。如果后面不传参数的话。
// node ./dist/index.js --template react-ts 111
// { _: [ 111 ], template: 'react-ts', t: 'react-ts' }

const argv = minimist<{
  template?: string;
  help?: boolean;
}>(process.argv.slice(2), {
  alias: { h: "help", t: "template" },
  // 传入的参数是string
  string: ["_"],
});

const helpMessage = `\
Usage: create-vite [OPTION]... [DIRECTORY]

Create a new Vite project in JavaScript or TypeScript.
With no arguments, start the CLI in interactive mode.

Options:
  -t, --template NAME        use a specific template

Available templates:
${chalk.yellow("vanilla-ts     vanilla")}
${chalk.green("vue-ts         vue")}
${chalk.cyan("react-ts       react")}
${chalk.cyan("react-swc-ts   react-swc")}
${chalk.magenta("preact-ts      preact")}
${chalk.redBright("lit-ts         lit")}
${chalk.red("svelte-ts      svelte")}
${chalk.blue("solid-ts       solid")}
${chalk.blueBright("qwik-ts        qwik")}`;

async function init() {
  const help = argv.help;
  // 如果传入了 help 参数，就打印帮助信息
  if (help) {
    console.log(helpMessage);
    return;
  }
}

init().catch((e) => {
  console.error(e);
});

// console.log(argv);
