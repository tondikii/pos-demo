---
name: pos-print
description: Bluetooth 58mm ESC/POS thermal printing for LarisPOS Android (react-native-ble-plx + manual ESC/POS builder + Share fallback). Use when adding or fixing receipt/shift printing in apps/mobile.
---

# POS Thermal Print (58mm ESC/POS)

Covers `apps/mobile` Bluetooth printing per `ARCHITECTURE.md` section 10 contract. Printer is 58mm ESC/POS; every transaction must succeed with or without a printer.

## When to use
- Any receipt, shift-close, or reprint feature in `apps/mobile`.
- Pairing, scanning, or permission changes for Bluetooth.

## Tooling
- `react-native-ble-plx` (Expo config plugin) — scan + connect.
- Manual ESC/POS byte builder (no heavy lib). `expo-sharing` / `react-native` `Share` for fallback.
- 58mm width = 32 chars at default font.

## Workflow

1. **Permissions (Android)**
   - `BLUETOOTH_SCAN` + `BLUETOOTH_CONNECT` (Android 12+) request before scan.

2. **Scan & connect**
   ```ts
   import { BleManager } from 'react-native-ble-plx'
   const mgr = new BleManager()
   mgr.startDeviceScan(null, null, (err, dev) => dev?.name?.includes('Printer') && connect(dev))
   ```

3. **Build ESC/POS buffer**
   ```ts
   // apps/mobile/src/print/escpos.ts
   function buildReceipt(tx: Tx, outlet: Outlet): Uint8Array {
     const b = new EscPos() // small helper around raw bytes
     b.alignCenter().text(outlet.name).text(outlet.receiptHeader || '')
     b.alignLeft().line('-'.repeat(32))
     tx.items.forEach(i => b.row(i.variantName, `${i.qty} x ${fmt(i.sellPrice)}`, fmt(i.lineTotal)))
     b.line('-'.repeat(32)).row('Subtotal', fmt(tx.subtotal))
     if (tx.taxAmount) b.row(`Pajak ${outlet.taxPercent}%`, fmt(tx.taxAmount))
     b.bold().row('TOTAL', fmt(tx.total)).text(`Bayar: ${tx.paymentMethod}  Kembalian: ${fmt(tx.change)}`)
     b.qr(tx.id).cut()
     return b.bytes()
   }
   ```

4. **Write to printer**
   ```ts
   await device.writeCharacteristicWithResponseForService(serviceUUID, charUUID, base64(bytes))
   ```

5. **Fallback (must exist)**
   ```ts
   if (!connected) await Share.share({ message: textReceipt(tx) }) // also "Cetak Ulang" in History
   ```

## Checklist before marking done
- [ ] Transaction never blocked when printer is offline — print is post-payment.
- [ ] "Cetak Ulang" and "Share Struk" available from History for every completed transaction.
- [ ] Tested on generic 58mm ESC/POS (e.g. Epson TM-T20, RPP02N) — line wrap at 32 chars.
- [ ] No Web/BLE APIs from browser assumed; this is native BLE only.
