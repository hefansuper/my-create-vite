/*
 * @Author: stephenHe
 * @Date: 2025-02-06 16:58:09
 * @LastEditors: stephenHe
 * @LastEditTime: 2025-02-06 17:26:17
 * @Description: 脚手架的入口文件
 * @FilePath: /my-create-vite/src/index.ts
 */

import chalk from "chalk";
import minimist from "minimist";
import prompts from "prompts";

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

// 默认的目标目录
const defaultTargetDir = "vite-project";

// 格式化传入的目标目录，去掉末尾的斜杠，aaa/ 替换成 aaa
function formatTargetDir(targetDir: string | undefined) {
  return targetDir?.trim().replace(/\/+$/g, "");
}

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
  // 1：如果传入了 --help或者-h 参数，就打印帮助信息
  if (help) {
    console.log(helpMessage);
    return;
  }

  // 2：获取传入的目标目录和模板
  // node ./dist/index.js aaa 获取的是aaa
  // npx my-create-vite 就让输入文件名字
  // npx my-create-vite aaa 因为传入了名字就不需要写名字了
  const argTargetDir = formatTargetDir(argv._[0]);
  console.log(argv);
  const argTemplate = argv.template || argv.t;

  // 用户输入的项目目录，也就是项目名
  let targetDir = argTargetDir || defaultTargetDir;

  // 3：开始交互式命令行
  let result: prompts.Answers<"projectName">;

  try {
    result = await prompts(
      [
        {
          type: argTargetDir ? null : "text",
          name: "projectName",
          message: chalk.reset("Project name:"),
          initial: defaultTargetDir,
          onState: (state) => {
            targetDir = formatTargetDir(state.value) || defaultTargetDir;
          },
        },
      ],
      {
        onCancel: () => {
          throw new Error(chalk.red("✖") + " Operation cancelled");
        },
      }
    );
  } catch (cancelled: any) {
    console.log(cancelled.message);
    return;
  }

  console.log("result", result);
}

init().catch((e) => {
  console.error(e);
});
