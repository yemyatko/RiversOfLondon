/* global foundry, game */
import { CoC7Item } from '../item.js'

export class CoC7Skill extends CoC7Item {
  constructor (data, context) {
    if (typeof data.system?.skillName === 'undefined') {
      if (typeof data.system === 'undefined') {
        data.system = {}
      }
      const construct = CoC7Skill.guessNameParts(data.name)
      if (!construct.isSpecialization) {
        data.system.skillName = data.name
      } else {
        data.system.skillName = construct.skillName
        data.system.specialization = construct.specialization
        if (typeof data.system.properties === 'undefined') {
          data.system.properties = {}
        }
        data.system.properties.special = true
        if (construct.isFighting || construct.isFirearms) {
          data.system.properties.combat = true
          if (construct.isFighting) {
            data.system.properties.fighting = true
          } else {
            data.system.properties.firearm = true
          }
        }
      }
    }
    super(data, context)
  }

  static guessNameParts (skillName) {
    const output = {
      skillName,
      specialization: '',
      isSpecialization: false,
      isFighting: false,
      isFirearms: false
    }
    const match = skillName.match(/^(.+)\s*\(([^)]+)\)$/)
    if (match) {
      output.skillName = match[2].trim()
      output.specialization = match[1].trim()
      output.isSpecialization = true
      if (output.specialization === game.i18n.localize('CoC7.FightingSpecializationName')) {
        output.isFighting = true
      } else if (output.specialization === game.i18n.localize('CoC7.FirearmSpecializationName')) {
        output.isFirearms = true
      }
    }
    return output
  }

  get hasActiveEffects () {
    return this.activeEffects.length > 0
  }

  get activeEffects () {
    if (this.parent && this.parent.effects) {
      const effectKeyFull = `skill.${this.name}`.toLowerCase()
      const effectKeyShort = `skill.${this.system.skillName}`.toLowerCase()
      let changes = this.parent.effects.reduce((changes, e) => {
        if (e.disabled || e.isSuppressed) return changes
        return changes.concat(
          e.data.changes.map(c => {
            c = foundry.utils.duplicate(c)
            c.effect = e
            c.priority = c.priority ?? c.mode * 10
            return c
          })
        )
      }, [])
      changes.sort((a, b) => a.priority - b.priority)
      changes = changes.filter(
        e =>
          e.key.toLowerCase() === effectKeyShort ||
          e.key.toLowerCase() === effectKeyFull
      )
      return changes
    }
    return []
  }

  /**
   * This is the value of the skill score unaffected by active effects
   */
  get rawValue () {
    let value = 0
    if (this.actor.type === 'character') {
      // For an actor with experience we need to calculate skill value
      value = this.base
      value += this.system.adjustments?.personal
        ? parseInt(this.system.adjustments?.personal)
        : 0
      value += this.system.adjustments?.occupation
        ? parseInt(this.system.adjustments?.occupation)
        : 0
      value += this.system.adjustments?.experience
        ? parseInt(this.system.adjustments?.experience)
        : 0
      if (
        game.settings.get('CoC7', 'pulpRuleArchetype') &&
        this.system.adjustments?.archetype
      ) {
        value += parseInt(this.system.adjustments?.archetype)
      }
    } else {
      // For all others actor we store the value directly
      value = parseInt(this.system.value)
    }
    return !isNaN(value) ? value : null
  }

  /**
   * This is the skill's value after active effects have been applied
   */
  get value () {
    const value = this.parent?.system.skills?.[`${this.system.skillName}`]
      ?.value
    return value || this.rawValue
  }

  async updateValue (value) {
    if (this.actor.type === 'character') {
      const delta = parseInt(value) - this.rawValue
      const exp =
        (this.system.adjustments?.experience
          ? parseInt(this.system.adjustments.experience)
          : 0) + delta
      await this.update({
        'system.adjustments.experience': exp > 0 ? exp : 0
      })
    } else await this.update({ 'system.value': value })
  }

  async increaseExperience (x) {
    if (this.type !== 'skill') return null
    if (this.actor.type === 'character') {
      const exp =
        (this.system.adjustments?.experience
          ? parseInt(this.system.adjustments.experience)
          : 0) + parseInt(x)
      await this.update({
        'system.adjustments.experience': exp > 0 ? exp : 0
      })
    }
  }

  // get value () {
  //   let pValue
  //   if( this.parent){

  //   }
  //   const value = super.value
  //   let updated = value
  //   for (const change of this.activeEffects) {
  //     const modifier = Number.fromString(change.value)
  //     if (!isNaN(modifier)) {
  //       const modes = CONST.ACTIVE_EFFECT_MODES
  //       switch (change.mode) {
  //         case modes.ADD:
  //           updated += modifier
  //           break
  //         case modes.MULTIPLY:
  //           updated = Math.round(updated * modifier)
  //           break
  //         case modes.OVERRIDE:
  //           updated = modifier
  //           break
  //         case modes.UPGRADE:
  //           if (modifer > updated) updated = modifier
  //           break
  //         case modes.DOWNGRADE:
  //           if (modifer < updated) updated = modifier
  //           break
  //       }
  //     }
  //   }
  //   if (!isNaN(updated) && updated != value) {
  //     if (updated < 0) updated = 0
  //     return updated
  //   } return value
  // }
}
