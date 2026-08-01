import { canUseMimoTts, isMimoTtsModel } from './tts-provider.util'

describe('MiMo TTS 配置校验', () => {
  it('应识别受支持的 MiMo TTS 模型', () => {
    expect(isMimoTtsModel('mimo-v2.5-tts')).toBe(true)
    expect(isMimoTtsModel('mimo-v2.5-tts-voicedesign')).toBe(true)
    expect(isMimoTtsModel('mimo-v2-flash')).toBe(false)
  })

  it('仅在 MiMo 端点、TTS 模型和密钥齐备时可用', () => {
    expect(canUseMimoTts({ apiKey: 'key', baseUrlPreset: 'mimo-default' }, 'mimo-v2.5-tts')).toBe(true)
    expect(canUseMimoTts({ apiKey: 'key', baseUrlPreset: 'openai' }, 'mimo-v2.5-tts')).toBe(false)
    expect(canUseMimoTts({ apiKey: 'key', baseUrlPreset: 'mimo-default' }, 'mimo-v2-flash')).toBe(false)
    expect(canUseMimoTts({ apiKey: '', baseUrlPreset: 'mimo-default' }, 'mimo-v2.5-tts')).toBe(false)
  })
})
