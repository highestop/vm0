import { Command } from "commander";
import chalk from "chalk";

export const dashboardCommand = new Command()
  .name("dashboard")
  .description("Quick reference for common query commands")
  .action(() => {
    console.log();
    console.log(chalk.bold("VM0 Dashboard"));
    console.log();

    console.log(chalk.bold("Agents"));
    console.log(chalk.dim("  List agents:      ") + "vm0 agent list");
    console.log();

    console.log(chalk.bold("Runs"));
    console.log(chalk.dim("  Recent runs:      ") + "vm0 run list");
    console.log(chalk.dim("  View run logs:    ") + "vm0 logs <run-id>");
    console.log();

    console.log(chalk.bold("Schedules"));
    console.log(chalk.dim("  List schedules:   ") + "vm0 schedule list");
    console.log();

    console.log(chalk.bold("Account"));
    console.log(chalk.dim("  Usage stats:      ") + "vm0 usage");
    console.log(chalk.dim("  List secrets:     ") + "vm0 secret list");
    console.log(chalk.dim("  List variables:   ") + "vm0 variable list");
    console.log();

    console.log(
      chalk.dim("Not logged in? Run: ") + chalk.cyan("vm0 auth login"),
    );
    console.log();
  });
