import * as b3 from './lib/behavior3js/index.js';

// note: tickResults will all reset to false after every tick, so don't need set `tickResults.xxx = false`.

class Loading extends b3.Action {
  tick(tick) {
    if (tick.blackboard.get('loaded')) {
      return b3.SUCCESS;
    } else {
      return b3.RUNNING;
    }
  }
}
class FallLoop extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const localPlayer = tick.target;
    if (!localPlayer.characterPhysics.grounded && ((tick.blackboard.get('now') - localPlayer.characterPhysics.lastGroundedTime) > 200)) {
      tickResults.fallLoop = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class StartFallLoopFromJump extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const tickTryActions = tick.blackboard.get('tickTryActions');
    const localPlayer = tick.target;
    if (tickTryActions.fallLoop?.from === 'jump' && !localPlayer.characterPhysics.grounded) {
      tickResults.fallLoopFromJump = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class FallLoopFromJump extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const localPlayer = tick.target;
    if (localPlayer.characterPhysics.grounded) {
      return b3.FAILURE;
    } else {
      tickResults.fallLoopFromJump = true;
      return b3.RUNNING;
    }
  }
}
class Fly extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const longTryActions = tick.blackboard.get('longTryActions');
    if (longTryActions.fly) {
      tickResults.fly = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class StartJump extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const tickTryActions = tick.blackboard.get('tickTryActions');
    const localPlayer = tick.target;
    if (
      (tickTryActions.jump && localPlayer.characterPhysics.grounded) ||
      localPlayer.hasAction('sit')
    ) {
      tickResults.jump = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class Jump extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const tickTryActions = tick.blackboard.get('tickTryActions');
    const localPlayer = tick.target;
    if (localPlayer.characterPhysics.grounded) {
      return b3.FAILURE;
    } else if (tickTryActions.jump) { // note: for trigger doubleJump.
      tickResults.jump = true; // note: doubleJump need jump in parallel.
      return b3.SUCCESS;
    } else {
      tickResults.jump = true;
      return b3.RUNNING;
    }
  }
}
class DoubleJump extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const localPlayer = tick.target;
    if (localPlayer.characterPhysics.grounded) {
      return b3.FAILURE;
    } else {
      tickResults.jump = true; // note: doubleJump need jump in parallel.
      tickResults.doubleJump = true;
      return b3.RUNNING;
    }
  }
}

class Land extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const localPlayer = tick.target;
    if (localPlayer.characterPhysics.grounded) {
      tickResults.land = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class Crouch extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const longTryActions = tick.blackboard.get('longTryActions');
    if (longTryActions.crouch) {
      tickResults.crouch = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class WaitOneTick extends b3.Action {
  tick(tick) {
    const ticked = tick.blackboard.get('ticked', tick.tree.id, this.id)
    if (ticked) {
      tick.blackboard.set('ticked', false, tick.tree.id, this.id)
      return b3.SUCCESS
    } else {
      tick.blackboard.set('ticked', true, tick.tree.id, this.id)
      return b3.RUNNING
    }
  }
}
class NarutoRun extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    // const tickTryActions = tick.blackboard.get('tickTryActions');
    const longTryActions = tick.blackboard.get('longTryActions');
    if (longTryActions.narutoRun) {
      tickResults.narutoRun = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}

const tree = new b3.BehaviorTree();
tree.root = new b3.MemSequence({title:'root',children: [
  new Loading({title:'Loading',}),
  new b3.Runnor({title:'loaded',child:
    new b3.Parallel({title:'main',children:[
      new b3.Priority({title:'base',children:[
        new b3.Sequence({title:'fly & narutoRun',children:[
          new Fly({title:'Fly'}),
          new b3.Succeedor({child: new NarutoRun({title:'NarutoRun'})}),
        ]}),
        new b3.MemSequence({title:'fallLoopFromJump',children:[
          new StartFallLoopFromJump({title:'StartFallLoopFromJump'}),
          new FallLoopFromJump({title:'FallLoopFromJump'}),
        ]}),
        new b3.MemSequence({title:'jump & doubleJump',children:[
          new StartJump({title:'StartJump'}),
          new WaitOneTick({title:'WaitOneTick'}), // note: wait leave ground.
          new Jump({title:'Jump'}),
          new DoubleJump({title:'DoubleJump'}),
        ]}),
        new FallLoop({title:'FallLoop'}),
        new Crouch({title:'Crouch'}),
        new NarutoRun({title:'NarutoRun'}),
      ]}), // end: base
      new Land({title:'Land'}),
    ]}), // end: main
  }), // end: loaded
]}); // end: root

// const preTickSettings = (localPlayer, blackboard) => {
// }

const postTickSettings = (localPlayer, blackboard) => {
  const setActions = () => {
    const tickResults = blackboard.get('tickResults');
    const lastTickResults = blackboard.get('lastTickResults');
    // const tickInfos = blackboard.get('tickInfos');
    const tickTryActions = blackboard.get('tickTryActions');
    const longTryActions = blackboard.get('longTryActions');
  
    if (tickResults.crouch && !lastTickResults.crouch) {
      localPlayer.addActionReal(longTryActions.crouch); // todo: auto-check tick or long ?
    }
    if (!tickResults.crouch && lastTickResults.crouch) localPlayer.removeActionReal('crouch');
  
    if (tickResults.land && !lastTickResults.land) {
        localPlayer.addActionReal({
          type: 'land',
          time: blackboard.get('now'),
          isMoving: localPlayer.avatar.idleWalkFactor > 0,
        });
    }
    if (!tickResults.land && lastTickResults.land) localPlayer.removeActionReal('land');
  
    if (tickResults.narutoRun && !lastTickResults.narutoRun) localPlayer.addActionReal(longTryActions.narutoRun);
    if (!tickResults.narutoRun && lastTickResults.narutoRun) localPlayer.removeActionReal('narutoRun');
  
    if (tickResults.fly && !lastTickResults.fly) localPlayer.addActionReal(longTryActions.fly); // todo: just tryActions is ok, don't need tick/long ?
    if (!tickResults.fly && lastTickResults.fly) localPlayer.removeActionReal('fly');
  
    if (tickResults.jump && !lastTickResults.jump) {
      localPlayer.addActionReal(tickTryActions.jump);
    }
    if (!tickResults.jump && lastTickResults.jump) {
      localPlayer.removeActionReal('jump');
    }
  
    if (tickResults.doubleJump && !lastTickResults.doubleJump) {
      localPlayer.addActionReal({
        type: 'doubleJump',
        startPositionY: localPlayer.characterPhysics.characterController.position.y,
      });
    }
    if (!tickResults.doubleJump && lastTickResults.doubleJump) {
      localPlayer.removeActionReal('doubleJump');
    }
  
    if (tickResults.fallLoop && !lastTickResults.fallLoop) {
      localPlayer.addActionReal({type: 'fallLoop'});
    }
    if (!tickResults.fallLoop && lastTickResults.fallLoop) localPlayer.removeActionReal('fallLoop');
  
    if (tickResults.fallLoopFromJump && !lastTickResults.fallLoopFromJump) {
      localPlayer.addActionReal(tickTryActions.fallLoop);
    }
    if (!tickResults.fallLoopFromJump && lastTickResults.fallLoopFromJump) {
      localPlayer.removeActionReal('fallLoop');
    }
  }
  setActions();

  const setLastTickResults = () => {
    const tickResults = blackboard.get('tickResults');
    const lastTickResults = blackboard.get('lastTickResults');
    for (const key in tickResults) {
      lastTickResults[key] = tickResults[key];
    }
  }
  setLastTickResults();

  const resetTickInfos = () => {
    // const tickInfos = blackboard.get('tickInfos');
    // for (const key in tickInfos) {
    //   tickInfos[key] = null;
    // }
    const tickTryActions = blackboard.get('tickTryActions');
    for (const key in tickTryActions) {
      tickTryActions[key] = null;
    }
    const tickResults = blackboard.get('tickResults');
    for (const key in tickResults) {
      tickResults[key] = false;
    }
  }
  resetTickInfos();
}

class ActionsManager {
  constructor(localPlayer) {
    this.localPlayer = localPlayer;
    this.blackboard = new b3.Blackboard(); // todo: make blackboard private.
    this.blackboard.set('tickResults', {});
    this.blackboard.set('lastTickResults', {});
    // this.blackboard.set('tickInfos', {});
    this.blackboard.set('tickTryActions', {});
    this.blackboard.set('longTryActions', {});
    this.blackboard.set('tickTryStopActions', {});
    this.blackboard.set('loaded', true);
  }
  get() {
    return this.blackboard.get(...arguments);
  }
  set() {
    return this.blackboard.set(...arguments);
  }
  tryAddAction(action, isLong = false) {
    if (isLong) {
      const longTryActions = this.blackboard.get('longTryActions');
      longTryActions[action.type] = action; // todo: how to handle multiple same actionType long try ?
    } else {
      const tickTryActions = this.blackboard.get('tickTryActions');
      tickTryActions[action.type] = action;
    }
  }
  tryRemoveAction(actionType, isLong = false) {
    if (isLong) {
      const longTryActions = this.blackboard.get('longTryActions');
      longTryActions[actionType] = null;
    } else {
      const tickTryStopActions = this.blackboard.get('tickTryStopActions');
      tickTryStopActions[actionType] = true;
    }
  }
  isLongTrying(actionType) {
    const longTryActions = this.blackboard.get('longTryActions');
    return !!longTryActions[actionType];
  }
  update(timestamp) {
    this.blackboard.set('now', timestamp);
    // preTickSettings(this.localPlayer, this.blackboard);
    tree.tick(this.localPlayer, this.blackboard);
    postTickSettings(this.localPlayer, this.blackboard);
  }
}

export {ActionsManager};
