const path = require("path");
const nodeExternals = require("webpack-node-externals");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const webpackConfig = {
  mode: "development",
  target: "node", // koa项目仅在node环境下运行，因此设置称'node'
  entry: {
    // 设置入口文件
    server: path.join(__dirname, "./src/app.ts"),
  },
  output: {
    // 设置打包后的文件和位置
    filename: "[name].bundle.js",
    path: path.join(__dirname, "./dist"),
  },
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env", "@babel/preset-typescript"],
            },
          },
          {
            loader: "ts-loader",
            // options: {
            //   // 关闭类型检查，即只进行转译
            //   // 类型检查交给 fork-ts-checker-webpack-plugin 在别的的线程中做
            //   transpileOnly: true,
            // },
          },
        ],
        // exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".js", ".ts"],
    alias: {
      "@babel/preset-typescript": require.resolve("@babel/preset-typescript"),
    },
  },
  optimization: {
    minimize: false,
    // minimizer: [
    //   new TerserPlugin({
    //     parallel: true, //使用多进程并发运行
    //     terserOptions: {
    //       compress: {
    //         drop_console: true,
    //         drop_debugger: true,
    //         pure_funcs: ["console.log"],
    //       },
    //       format: { comments: false },
    //     },
    //     extractComments: true, //将注释剥离到单独的文件中
    //   }),
    // ],
  },
  externals: [nodeExternals()], // 排除对node_modules里的依赖进行打包
  plugins: [
    new CleanWebpackPlugin(), // 打包前清除输出目录
    new NodePolyfillPlugin(),
    // new ForkTsCheckerWebpackPlugin({
    //   // async 为 false，同步的将错误信息反馈给 webpack，如果报错了，webpack 就会编译失败
    //   // async 默认为 true，异步的将错误信息反馈给 webpack，如果报错了，不影响 webpack 的编译
    //   // async: false,
    //   // eslint: false,
    //   checkSyntacticErrors: true,
    // }),
  ],
};

module.exports = webpackConfig;
