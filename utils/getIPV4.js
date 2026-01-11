import os from "os";

/**
 * Returns the first non-internal IPv4 address of the machine.
 * @returns {string|null}
 */
export function getLocalIPv4() {
    const interfaces = os.networkInterfaces();

    for (const iface of Object.values(interfaces)) {
        for (const addr of iface) {
            if (addr.family === "IPv4" && !addr.internal) {
                return addr.address;
            }
        }
    }

    return null;
}
