import { builder } from "./builder/builder";

const _init = async () => {
  try {
    await builder();
  } catch (err) {
    process.exit(1);
  }
};

_init();
