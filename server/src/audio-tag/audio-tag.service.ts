import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like } from 'typeorm'
import { AudioTag } from './audio-tag.entity'

const AUDIO_TAG_PRESETS: { name: string; code: string; group: string; description: string }[] = [
  // 基础情绪
  { name: '开心', code: 'happy', group: 'basicEmotion', description: '开心愉悦的语气' },
  { name: '悲伤', code: 'be_sad', group: 'basicEmotion', description: '悲伤难过的语气' },
  { name: '愤怒', code: 'be_angry', group: 'basicEmotion', description: '愤怒生气的语气' },
  { name: '恐惧', code: 'be_fear', group: 'basicEmotion', description: '恐惧害怕的语气' },
  { name: '惊讶', code: 'surprised', group: 'basicEmotion', description: '惊讶意外的语气' },
  { name: '兴奋', code: 'be_excited', group: 'basicEmotion', description: '兴奋激动的语气' },
  { name: '委屈', code: 'be_grieved', group: 'basicEmotion', description: '委屈难过的语气' },
  { name: '平静', code: 'be_calm', group: 'basicEmotion', description: '平静淡然的语气' },
  { name: '冷漠', code: 'be_indifferent', group: 'basicEmotion', description: '冷漠疏离的语气' },
  // 复合情绪
  { name: '怅然', code: 'ce_changran', group: 'complexEmotion', description: '怅然若失的语气' },
  { name: '欣慰', code: 'ce_xinwei', group: 'complexEmotion', description: '欣慰满足的语气' },
  { name: '无奈', code: 'ce_wunai', group: 'complexEmotion', description: '无可奈何的语气' },
  { name: '愧疚', code: 'ce_kuijiu', group: 'complexEmotion', description: '愧疚自责的语气' },
  { name: '释然', code: 'ce_shiran', group: 'complexEmotion', description: '释然解脱的语气' },
  { name: '嫉妒', code: 'ce_jidu', group: 'complexEmotion', description: '嫉妒不满的语气' },
  { name: '厌倦', code: 'ce_yanjuan', group: 'complexEmotion', description: '厌倦疲惫的语气' },
  { name: '忐忑', code: 'ce_tante', group: 'complexEmotion', description: '忐忑不安的语气' },
  { name: '动情', code: 'ce_dongqing', group: 'complexEmotion', description: '动情感人的语气' },
  // 整体语调
  { name: '温柔', code: 'gentle', group: 'tone', description: '温柔平和的语气' },
  { name: '高冷', code: 'tn_gaoleng', group: 'tone', description: '高冷疏离的语气' },
  { name: '活泼', code: 'tn_huopo', group: 'tone', description: '活泼欢快的语气' },
  { name: '严肃', code: 'tn_yansu', group: 'tone', description: '严肃认真的语气' },
  { name: '慵懒', code: 'tn_yonglan', group: 'tone', description: '慵懒随意的语气' },
  { name: '俏皮', code: 'tn_qiaopi', group: 'tone', description: '俏皮可爱的语气' },
  { name: '深沉', code: 'tn_shenchen', group: 'tone', description: '深沉内敛的语气' },
  { name: '干练', code: 'tn_ganlian', group: 'tone', description: '干练利落的语气' },
  { name: '凌厉', code: 'tn_lingli', group: 'tone', description: '凌厉强势的语气' },
  // 音色定位
  { name: '磁性', code: 'vq_cixing', group: 'voiceQuality', description: '磁性迷人的音色' },
  { name: '醇厚', code: 'vq_chunhou', group: 'voiceQuality', description: '醇厚饱满的音色' },
  { name: '清亮', code: 'vq_qingliang', group: 'voiceQuality', description: '清亮通透的音色' },
  { name: '空灵', code: 'vq_kongling', group: 'voiceQuality', description: '空灵飘逸的音色' },
  { name: '稚嫩', code: 'vq_zhinen', group: 'voiceQuality', description: '稚嫩童真的音色' },
  { name: '苍老', code: 'vq_canglao', group: 'voiceQuality', description: '苍老沧桑的音色' },
  { name: '甜美', code: 'vq_tianmei', group: 'voiceQuality', description: '甜美可爱的音色' },
  { name: '沙哑', code: 'vq_shaya', group: 'voiceQuality', description: '沙哑低沉的音色' },
  { name: '醇雅', code: 'vq_chunya', group: 'voiceQuality', description: '醇雅温润的音色' },
  // 人设腔调
  { name: '夹子音', code: 'ch_jiaziyin', group: 'character', description: '夹子音腔调' },
  { name: '御姐音', code: 'ch_yujieyin', group: 'character', description: '御姐音腔调' },
  { name: '正太音', code: 'ch_zhengtaiyin', group: 'character', description: '正太音腔调' },
  { name: '大叔音', code: 'ch_dashuyin', group: 'character', description: '大叔音腔调' },
  { name: '台湾腔', code: 'ch_taiwanqiang', group: 'character', description: '台湾腔调' },
  // 方言
  { name: '东北话', code: 'dongbei', group: 'dialect', description: '东北方言' },
  { name: '四川话', code: 'dt_sichuan', group: 'dialect', description: '四川方言' },
  { name: '河南话', code: 'dt_henan', group: 'dialect', description: '河南方言' },
  { name: '粤语', code: 'dt_yueyu', group: 'dialect', description: '粤方言' },
  // 角色扮演
  { name: '孙悟空', code: 'rp_sunwukong', group: 'roleplay', description: '孙悟空角色' },
  { name: '林黛玉', code: 'rp_lindaiyu', group: 'roleplay', description: '林黛玉角色' },
  // 音频效果
  { name: '吸气', code: 'ae_xiqi', group: 'audioEffect', description: '吸气音效' },
  { name: '深呼吸', code: 'ae_shenhuxi', group: 'audioEffect', description: '深呼吸音效' },
  { name: '叹气', code: 'ae_tanqi', group: 'audioEffect', description: '叹气音效' },
  { name: '长叹一口气', code: 'ae_changtan', group: 'audioEffect', description: '长叹音效' },
  { name: '喘息', code: 'ae_chuanxi', group: 'audioEffect', description: '喘息音效' },
  { name: '屏息', code: 'ae_bingxi', group: 'audioEffect', description: '屏息音效' },
  { name: '紧张', code: 'ae_jinzhang', group: 'audioEffect', description: '紧张语气' },
  { name: '害怕', code: 'ae_haipa', group: 'audioEffect', description: '害怕语气' },
  { name: '激动', code: 'ae_jidong', group: 'audioEffect', description: '激动语气' },
  { name: '疲惫', code: 'ae_pibei', group: 'audioEffect', description: '疲惫语气' },
  { name: '撒娇', code: 'ae_sajiao', group: 'audioEffect', description: '撒娇语气' },
  { name: '心虚', code: 'ae_xinxu', group: 'audioEffect', description: '心虚语气' },
  { name: '震惊', code: 'ae_zhenjing', group: 'audioEffect', description: '震惊语气' },
  { name: '不耐烦', code: 'ae_bunaifan', group: 'audioEffect', description: '不耐烦语气' },
  { name: '颤抖', code: 'ae_chandou', group: 'audioEffect', description: '颤抖音效' },
  { name: '声音颤抖', code: 'ae_shengyinchandou', group: 'audioEffect', description: '声音颤抖音效' },
  { name: '变调', code: 'ae_biandiao', group: 'audioEffect', description: '变调音效' },
  { name: '破音', code: 'ae_poyin', group: 'audioEffect', description: '破音音效' },
  { name: '鼻音', code: 'ae_biyin', group: 'audioEffect', description: '鼻音音效' },
  { name: '气声', code: 'ae_qisheng', group: 'audioEffect', description: '气声音效' },
  { name: '笑', code: 'ae_xiao', group: 'audioEffect', description: '笑声' },
  { name: '轻笑', code: 'ae_qingxiao', group: 'audioEffect', description: '轻笑声' },
  { name: '大笑', code: 'ae_daxiao', group: 'audioEffect', description: '大笑声' },
  { name: '冷笑', code: 'ae_lengxiao', group: 'audioEffect', description: '冷笑声' },
  { name: '抽泣', code: 'ae_chouqi', group: 'audioEffect', description: '抽泣声' },
  { name: '呜咽', code: 'ae_wuye', group: 'audioEffect', description: '呜咽声' },
  { name: '哽咽', code: 'ae_gengye', group: 'audioEffect', description: '哽咽声' },
  { name: '嚎啕大哭', code: 'ae_haotao', group: 'audioEffect', description: '嚎啕大哭声' },
]

@Injectable()
export class AudioTagService {
  constructor(
    @InjectRepository(AudioTag)
    private audioTagRepository: Repository<AudioTag>,
  ) {}

  async seed() {
    for (let i = 0; i < AUDIO_TAG_PRESETS.length; i++) {
      const preset = AUDIO_TAG_PRESETS[i]
      let tag = await this.audioTagRepository.findOne({ where: { name: preset.name } })
      if (tag) {
        // 更新已有标签（同步 group、code、description、sort）
        tag.code = preset.code
        tag.group = preset.group
        tag.description = preset.description
        tag.sort = i + 1
        await this.audioTagRepository.save(tag)
      } else {
        tag = this.audioTagRepository.create({
          ...preset,
          sort: i + 1,
        })
        await this.audioTagRepository.save(tag)
      }
    }
  }

  async findAll(page = 1, pageSize = 10, query?: { name?: string; code?: string; group?: string }): Promise<[AudioTag[], number]> {
    const qb = this.audioTagRepository.createQueryBuilder('tag')
      .orderBy('tag.sort', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    if (query?.name) {
      qb.andWhere('tag.name LIKE :name', { name: `%${query.name}%` })
    }
    if (query?.code) {
      qb.andWhere('tag.code LIKE :code', { code: `%${query.code}%` })
    }
    if (query?.group) {
      qb.andWhere('tag.group = :group', { group: query.group })
    }

    return qb.getManyAndCount()
  }

  async create(data: Partial<AudioTag>): Promise<AudioTag> {
    const tag = this.audioTagRepository.create(data)
    return this.audioTagRepository.save(tag)
  }

  async update(id: number, data: Partial<AudioTag>): Promise<AudioTag | null> {
    await this.audioTagRepository.update(id, data)
    return this.audioTagRepository.findOne({ where: { id } })
  }

  async delete(id: number): Promise<void> {
    await this.audioTagRepository.delete(id)
  }
}
