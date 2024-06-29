// Path: packages/utils/src/spawn.ts

// It's disappointing but bun's shell $ commands are unreliable. They can cause the process to silently exit.
// This is a workaround to use spawnSync instead.

export function spawnCommand(args: string[]): string {
    const proc = Bun.spawnSync(args)
    return proc.stdout.toString().trim()
}

export function spawnCommandLine(command: string): string {
    const proc = Bun.spawnSync(command.split(' '))
    return proc.stdout.toString().trim()
}
