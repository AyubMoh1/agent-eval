#!/usr/bin/env node

import { Command } from "commander";

const program = new Command();

program
  .name("agent-eval")
  .description("Lightweight CLI for testing AI agent behavior")
  .version("0.1.0");

program.parse();
