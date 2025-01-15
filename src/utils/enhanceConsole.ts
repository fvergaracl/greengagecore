const isBrowser = typeof window !== "undefined"

const enhanceConsole = () => {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info
  }

  if (isBrowser) {
    // Browser styling
    const COLORS = {
      error: "color: red; font-weight: bold",
      warn: "color: orange; font-weight: bold",
      info: "color: blue; font-weight: bold",
      success: "color: green; font-weight: bold"
    }

    console.log = (...args: any[]) => {
      originalConsole.log("%c[+]", COLORS.success, ...args)
    }

    console.warn = (...args: any[]) => {
      originalConsole.warn("%c[!]", COLORS.warn, ...args)
    }

    console.error = (...args: any[]) => {
      originalConsole.error("%c[-]", COLORS.error, ...args)
    }

    console.info = (...args: any[]) => {
      originalConsole.info("%c[*]", COLORS.info, ...args)
    }
  } else {
    // Node.js styling
    const COLORS = {
      error: "\x1b[31m",
      warn: "\x1b[33m",
      info: "\x1b[34m",
      success: "\x1b[32m",
      reset: "\x1b[0m"
    }

    console.log = (...args: any[]) => {
      originalConsole.log(`${COLORS.success}[+]${COLORS.reset}`, ...args)
    }

    console.warn = (...args: any[]) => {
      originalConsole.warn(`${COLORS.warn}[!]${COLORS.reset}`, ...args)
    }

    console.error = (...args: any[]) => {
      originalConsole.error(`${COLORS.error}[-]${COLORS.reset}`, ...args)
    }

    console.info = (...args: any[]) => {
      originalConsole.info(`${COLORS.info}[*]${COLORS.reset}`, ...args)
    }
  }
}

export default enhanceConsole
