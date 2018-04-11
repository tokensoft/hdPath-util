import Promise from "bluebird"
import Eth from "@ledgerhq/hw-app-eth"
import Transport from "@ledgerhq/hw-transport-node-hid"
import meow from "meow"

const basePaths = [
  "44'/60'/0'",         // Ledger (ETH)
  "44'/60'/160720'/0'", // Ledger (ETC)
  "44'/60'/0'/0",       // TREZOR (ETH)
  "44'/61'/0'/0",       // TREZOR (ETC)
  "44'/60'/1'/0"        // MEW - "Your Custom Path"
]

const getEthAddressFactory = async () => {
  const transport = await Transport.create()
  const eth = new Eth(transport)

  return (async (hdPath) => {
    console.debug('    looking for address at path', hdPath)
    const result = await eth.getAddress(hdPath)
    console.debug('    found address:', result.address)
    return result.address
  })
}

const getEthAddressPath = async (address, hdPaths, getEthAddress) => {
  for (let hdPath of hdPaths) {
    try {
      console.debug('  current hdPath:', hdPath)
      const foundAddress = await getEthAddress(hdPath)
      if (address.toLowerCase() === foundAddress.toLowerCase()) {
        console.log('  !!! A MATCH !!!')
        return hdPath
      }
    } catch (err) { /* noop */ }
  }
  return 'No path found'
}

const runAsync = async ({ a: addressesString, i: indexDepthString }) => {
  const addresses = addressesString.split(',').map(s => s.trim())
  const indexDepth = parseInt(indexDepthString)

  const indexRange = []
  for (let i = 0; i < indexDepth; i++) indexRange.push(i)

  const hdPaths = basePaths.reduce((_hdPaths, basePath) => {
    const derivedPaths = indexRange.map(i => `${basePath}/${i}`)
    _hdPaths = _hdPaths.concat(derivedPaths)
    return _hdPaths
  }, [])

  const getEthAddress = await getEthAddressFactory()

  const results = await Promise.reduce(addresses, async (result, address) => {
    console.debug('searching address:', address)
    const pathResult = await getEthAddressPath(address, hdPaths, getEthAddress)
    console.debug('result:', pathResult, '\n')
    result[address] = pathResult
    return result
  }, {})

  console.log(JSON.stringify(results, null, 2))
}

const cli = meow(
  `
  Usage
    $ -a 0x3721d521C67b2C436170EDC7a3cd9b22758C6471 -i 10

  Options
    --address(es),  -a    A comma separated list of addresses you wish to search for
    --index-depth,  -i    The number of indexes you'd like to search along each hdPath
  `,
  {
    flags: {
      'addresses': {
        type: 'string',
        alias: 'a',
        default: '0x3721d521C67b2C436170EDC7a3cd9b22758C6471, 0xcda11d5a0D0e640F456df83b0510035d03b0DA6E, 0xb5cf953Eac885fA492E9a544A75847138A4c2838, 0x26115228e790B9D4F53FbBB5C3b057106dddFF6d'
        // Keep Network multisig owners [Corbin, Sean, Matt]
        // default: '0x8699e6FB85f132960b88a4b710c608C152C98aBc, 0xC54A7B2bA647EEd78E42F785a97313e98B70c0Cd, 0xE52E028f0D8F2E7A9d78E48199234b1231774E6a'
      },
      'index-depth': {
        type: 'string',
        alias: 'i',
        default: '5'
      }
    }
  }
)

console.log(
  "Ledger must be:\n",
  "  - plugged in\n",
  "  - unlocked\n",
  "  - on the Ethereum application\n",
  "  - with the following settings:\n",
  "    - Contract data -> Yes\n",
  "    - Browser support -> No\n"
)

runAsync(cli.flags)
