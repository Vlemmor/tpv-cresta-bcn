/**
 * LA CRESTA BCN - Bluetooth Thermal Printer Utility
 * Uses Web Bluetooth API to send ESC/POS commands to generic thermal printers.
 */

const ESC = 0x1B;
const GS = 0x1D;

const BluetoothPrinter = {
    device: null,
    server: null,
    service: null,
    characteristic: null,
    isConnected: false,

    // Common UUIDs for Bluetooth Thermal Printers
    // Many use a generic serial port profile or standard custom UUIDs
    serviceUuid: '000018f0-0000-1000-8000-00805f9b34fb'.toLowerCase(),
    characteristicUuid: '00002af1-0000-1000-8000-00805f9b34fb'.toLowerCase(),

    /**
     * Request connection to a nearby Bluetooth printer
     */
    connect: async function () {
        if (!navigator.bluetooth) {
            CustomModal.show({
                title: "Error",
                message: "Tu navegador no soporta Bluetooth Web. Usa Chrome en Android.",
                iconType: "danger",
                buttons: [{ text: "Ok" }]
            });
            return false;
        }

        try {
            console.log('Requesting Bluetooth Device...');
            // Try to find printers. Often they announce themselves with standard service UUIDs
            // Or we just ask for all devices and filter later (riskier but more compatible)
            this.device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [
                    '000018f0-0000-1000-8000-00805f9b34fb', // Standard printer service
                    'e7810a71-73ae-499d-8c15-faa9aef0c3f2'  // Generic serial
                ]
            });

            console.log('Connecting to GATT Server...');
            this.server = await this.device.gatt.connect();

            console.log('Getting Services...');
            const services = await this.server.getPrimaryServices();
            if (services.length === 0) throw new Error("No services found");

            this.service = services[0]; // Usually the first service is the one we want for basic printers

            console.log('Getting Characteristics...');
            const characteristics = await this.service.getCharacteristics();
            if (characteristics.length === 0) throw new Error("No characteristics found");

            // Find a writable characteristic
            this.characteristic = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);

            if (!this.characteristic) {
                throw new Error("No writable characteristic found on this device.");
            }

            this.isConnected = true;
            this.device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));

            console.log('Printer connected successfully!');
            return true;

        } catch (error) {
            console.error('Connection failed!', error);
            this.isConnected = false;
            CustomModal.show({
                title: "Error de Conexión",
                message: "No se pudo conectar a la impresora: " + error.message,
                iconType: "danger",
                buttons: [{ text: "Ok" }]
            });
            return false;
        }
    },

    onDisconnected: function () {
        console.log('Device disconnected');
        this.isConnected = false;
        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristic = null;
        // Trigger UI update if needed
        app.updatePrinterUIStatus();
    },

    /**
     * Transmit raw bytes to the printer in chunks to avoid overwhelming the BLE buffer
     */
    sendData: async function (dataArray) {
        if (!this.isConnected || !this.characteristic) {
            console.error("Not connected to printer.");
            return false;
        }

        const maxChunk = 100; // Safe chunk size for BLE
        const buffer = new Uint8Array(dataArray);

        try {
            for (let i = 0; i < buffer.length; i += maxChunk) {
                let chunk = buffer.slice(i, i + maxChunk);
                await this.characteristic.writeValue(chunk);
                // Tiny delay to let printer digest
                await new Promise(r => setTimeout(r, 20));
            }
            return true;
        } catch (error) {
            console.error("Write error: ", error);
            return false;
        }
    },

    // --- ESC/POS Command Builders ---

    textToBytes: function (text) {
        // Basic ASCII/Latin-1 encoding. For complex accents, code pages (ESC t n) are needed.
        // For simplicity, removing accents or mapping them to basic characters is safest on thermal printers.
        const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let bytes = [];
        for (let i = 0; i < normalized.length; i++) {
            bytes.push(normalized.charCodeAt(i));
        }
        return bytes;
    },

    alignCenter: function () { return [ESC, 0x61, 1]; },
    alignLeft: function () { return [ESC, 0x61, 0]; },
    alignRight: function () { return [ESC, 0x61, 2]; },
    boldOn: function () { return [ESC, 0x45, 1]; },
    boldOff: function () { return [ESC, 0x45, 0]; },
    textSize: function (width, height) { return [GS, 0x21, (width << 4) | height]; },
    cutPaper: function () { return [GS, 0x56, 0x00]; },
    newLine: function () { return [0x0A]; },
    initPrinter: function () { return [ESC, 0x40]; },

    formatLine: function (leftText, rightText, totalWidth = 32) {
        const left = leftText.toString();
        const right = rightText.toString();
        const spaces = totalWidth - left.length - right.length;
        if (spaces <= 0) {
            return left.substring(0, totalWidth - right.length - 1) + " " + right;
        }
        return left + " ".repeat(spaces) + right;
    },

    /**
     * Generates the receipt payload and sends it
     */
    printReceipt: async function (tableId, cartItems) {
        if (!this.isConnected) return false;

        let data = [];

        // Initialize
        data.push(...this.initPrinter());

        // Header
        data.push(...this.alignCenter());
        data.push(...this.textSize(1, 1)); // Double width & height
        data.push(...this.boldOn());
        data.push(...this.textToBytes("LA CRESTA BCN\n"));
        data.push(...this.textSize(0, 0)); // Normal
        data.push(...this.boldOff());
        data.push(...this.textToBytes("Ticket de Venta\n"));
        data.push(...this.newLine());

        // Info
        data.push(...this.alignLeft());
        data.push(...this.textToBytes(`Fecha: ${new Date().toLocaleString()}\n`));
        data.push(...this.textToBytes(`Sala: ${tableId}\n`));
        data.push(...this.textToBytes("--------------------------------\n"));

        // Items
        let subtotal = 0;
        cartItems.forEach(item => {
            let left = `${item.qty}x ${item.name}`;
            let right = `E${item.subtotal.toFixed(2)}`; // E instead of Euro symbol which often breaks on thermal
            data.push(...this.textToBytes(this.formatLine(left, right) + "\n"));
            subtotal += item.subtotal;
        });

        data.push(...this.textToBytes("--------------------------------\n"));

        // Totals
        const tax = subtotal - (subtotal / 1.10);
        const base = subtotal / 1.10;

        data.push(...this.textToBytes(this.formatLine("Subtotal Base", `E${base.toFixed(2)}`) + "\n"));
        data.push(...this.textToBytes(this.formatLine("IVA (10%)", `E${tax.toFixed(2)}`) + "\n"));

        data.push(...this.newLine());
        data.push(...this.textSize(0, 1)); // Double height
        data.push(...this.boldOn());
        data.push(...this.textToBytes(this.formatLine("TOTAL", `E${subtotal.toFixed(2)}`) + "\n"));
        data.push(...this.textSize(0, 0));
        data.push(...this.boldOff());

        data.push(...this.newLine());
        data.push(...this.alignCenter());
        data.push(...this.textToBytes("Gracias por su visita!\n"));
        data.push(...this.newLine());
        data.push(...this.newLine());
        data.push(...this.newLine());

        // Cut
        data.push(...this.cutPaper());

        // Send
        return await this.sendData(data);
    }
};
