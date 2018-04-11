import Promise from "bluebird"
import Eth from "@ledgerhq/hw-app-eth"
import Transport from "@ledgerhq/hw-transport-node-hid"
import prompt from "prompt"

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

const run = async (err, { addresses: _addresses, indexDepth: _indexDepth }) => {
  const addresses = _addresses.map(s => s.trim())
  const indexDepth = parseInt(_indexDepth)

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

console.log(
  "Ledger must be:\n",
  "  - plugged in\n",
  "  - unlocked\n",
  "  - on the Ethereum application\n",
  "  - with the following settings:\n",
  "    - Contract data -> Yes\n",
  "    - Browser support -> No\n"
)
prompt.start()
prompt.get([
  {
    name: 'addresses',
    type: 'array',
    description: "Enter a list of addresses to lookup, use ctrl-c to continue",
    minItems: 1,
    default: [],
    required: true
  },
  {
    name: 'indexDepth',
    message: 'Enter the number of indexes you wish to search, default is 5',
    type: 'number',
    default: '5'
  }
], run)
