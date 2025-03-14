#!/usr/bin/env node

import chalk from "chalk";
import minimist from "minimist";
import prompts from "prompts";

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import fsExtra from "fs-extra";

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
  // console.log(argv);
  // 传入的模板名字 --template react-ts 就是react-ts
  const argTemplate = argv.template || argv.t;

  // 用户输入的项目目录，也就是项目名
  let targetDir = argTargetDir || defaultTargetDir;

  // 3：框架的配置项
  type Framework = {
    // 框架名
    name: string;
    // 框架展示名字
    display: string;
    color: Function;
    // 每个框架下的变种
    variants: FrameworkVariant[];
  };

  type FrameworkVariant = {
    name: string;
    display: string;
    color: Function;
    customCommand?: string;
  };

  const FRAMEWORKS: Framework[] = [
    {
      name: "vue",
      display: "Vue",
      color: chalk.green,
      variants: [
        {
          name: "vue-ts",
          display: "TypeScript",
          color: chalk.blue,
        },
        {
          name: "vue",
          display: "JavaScript",
          color: chalk.yellow,
        },
      ],
    },
    {
      name: "react",
      display: "React",
      color: chalk.cyan,
      variants: [
        {
          name: "react-ts",
          display: "TypeScript",
          color: chalk.blue,
        },
        {
          name: "react-swc-ts",
          display: "TypeScript + SWC",
          color: chalk.blue,
        },
        {
          name: "react",
          display: "JavaScript",
          color: chalk.yellow,
        },
        {
          name: "react-swc",
          display: "JavaScript + SWC",
          color: chalk.yellow,
        },
      ],
    },
  ];

  const TEMPLATES = FRAMEWORKS.map((f) => {
    return f.variants?.map((v) => v.name);
  }).reduce((a, b) => {
    return a.concat(b);
  }, []);

  // 4：开始交互式命令行
  let result: prompts.Answers<"projectName">;

  // type为null的时候就不会展示。
  try {
    result = await prompts(
      [
        // 项目名字
        {
          type: argTargetDir ? null : "text",
          name: "projectName",
          message: chalk.reset("Project name:"),
          initial: defaultTargetDir,
          onState: (state) => {
            targetDir = formatTargetDir(state.value) || defaultTargetDir;
          },
        },
        // 框架选择
        // 如果写了 --template react-ts 就不会展示这个选项
        {
          type:
            argTemplate && TEMPLATES.includes(argTemplate) ? null : "select",
          name: "framework",
          message: chalk.reset("Select a framework:"),
          initial: 0,
          choices: FRAMEWORKS.map((framework) => {
            const frameworkColor = framework.color;
            return {
              title: frameworkColor(framework.display || framework.name),
              value: framework,
            };
          }),
        },
        // 每个框架下面的选项
        {
          type: (framework: Framework) =>
            framework && framework.variants ? "select" : null,
          name: "variant",
          message: chalk.reset("Select a variant:"),
          choices: (framework: Framework) =>
            framework.variants.map((variant) => {
              const variantColor = variant.color;
              return {
                title: variantColor(variant.display || variant.name),
                value: variant.name,
              };
            }),
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

  const { framework, variant } = result as unknown as {
    framework: string;
    variant: string;
  };

  // 5：获取最终要生成的目录（输入的项目名字）

  // 获取当前执行命令的目录，拼接上目标目录。 最终生成目录
  // process.cwd() 返回执行当前命令的目录
  const root = path.join(process.cwd(), targetDir);
  let template: string = variant || argTemplate;
  console.log(`\nScaffolding project in ${root}...`);

  // 6：获取选择的模板文件的文件夹地址。
  // import.meta.url 就是当前文件的路径、不过是 file:/// 开头的，所以需要转换一下
  // file:///Users/stephen/project-self/my-create-vite/dist/index.js
  // Users/stephen/project-self/my-create-vite/template-vue-ts
  const templateDir = path.resolve(
    fileURLToPath(import.meta.url),
    "../..",
    `template-${template}`
  );

  // 7：复制模板到对应的目录中。
  // 7-1: 检查目标目录是否存在,不存在就创建
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }
  // 7-2: 复制模板文件到目标目录
  fsExtra
    .copy(templateDir, root)
    .then(() => {
      // 是拿到从 a 目录到 b 目录的相对路径。
      const cdProjectName = path.relative(process.cwd(), root);
      console.log(`\nDone. Now run:\n`);
      if (root !== process.cwd()) {
        console.log(
          `  cd ${
            cdProjectName.includes(" ") ? `"${cdProjectName}"` : cdProjectName
          }`
        );
      }
      console.log(`  npm install`);
      console.log(`  npm run dev`);
      console.log();
    })
    .catch((err) => console.error(err));
}

init().catch((e) => {
  console.error(e);
});
