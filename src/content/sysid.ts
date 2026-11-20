// Chapter 6: fitting a simulated arm to a real one. Real data: the public LeRobot dataset
// lerobot/svla_so100_pickplace (a real SO-100 arm). Fits and evaluations: so-arm100-sim README,
// section "Real2sim", and so-arm100-rl README (real_fit paragraph), all measured 2026-11-20.
import type { Source, Stage } from './tick'

const simReadme: Source = { label: 'so-arm100-sim README, Real2sim section', ref: 'so-arm100-sim/README.md' }
const rlReadme: Source = { label: 'so-arm100-rl README, held-out gap table and real_fit', ref: 'so-arm100-rl/README.md' }
const dataset: Source = { label: 'LeRobot dataset svla_so100_pickplace', ref: 'huggingface.co/datasets/lerobot/svla_so100_pickplace' }
const motorsBus: Source = { label: 'LeRobot motors_bus.py, degree normalisation', ref: 'github.com/huggingface/lerobot' }
const mujocoActuator: Source = { label: 'MuJoCo XML reference, position actuator', ref: 'mujoco.readthedocs.io/en/stable/XMLreference.html' }

export const sysid = {
  example:
    'The real side is a public recording of an SO-100 arm: 50 pick-and-place episodes at 30 fps. The sim side is the MuJoCo model of the same arm. No hardware was run for this chapter.',
}

export const steps: Stage[] = [
  {
    id: 'data',
    title: 'Record command and response',
    what: 'A teleoperated arm logs two things every frame: the command from the leader arm and the position the follower actually reached. The gap between them is the servo dynamics you want the sim to copy.',
    budget: '50 episodes, 19,631 frames at 30 fps. Both signals in degrees, the gripper on a 0–100 scale.',
    failure: 'Contact hides dynamics: the gripper reads 1.6° from its command because the cube blocks the jaw. Fit the arm joints only.',
    sources: [dataset, simReadme],
  },
  {
    id: 'zero',
    title: 'Agree on where zero is',
    what: 'The real arm and the model measure angles from different zeros. LeRobot puts zero at the middle of the range the operator moved through during calibration, so every setup has its own offset.',
    budget: 'Offsets are fitted as nuisance parameters. They only change the gravity load, so they are fitted first and then held fixed.',
    failure: 'The Elbow offset came out 37° for one recording and 77° for another, and it sits on its range bound. The zero is not shared between recordings.',
    sources: [motorsBus, simReadme],
  },
  {
    id: 'replay',
    title: 'Replay the commands in sim',
    what: 'Feed each real command to the sim arm for one frame, start from the measured pose, and compare the sim follower with the real one, joint by joint.',
    budget: 'A trajectory produced by the sim itself replays with zero error; a different gain or delay does not. 10 real episodes replay in 0.7 s on one core.',
    failure: 'The real follower trails its command by 3 frames (100 ms). Adding that as a command delay makes the sim worse, because the simulated servo already lags that much.',
    sources: [simReadme],
  },
  {
    id: 'fit',
    title: 'Fit the servo',
    what: 'Search gain, damping ratio, armature, joint friction and passive damping to minimise the replay error on 10 episodes, then score 10 held-out episodes.',
    budget: 'Held-out mean error 0.370° with the model defaults, 0.349° with fitted offsets, 0.294° with the fitted servo: gain 50 → 38.8, joint friction 0.1 → 0.25.',
    failure: 'The optimiser stopped at its evaluation cap. Passive damping came out 0.20, 0.018 and 0.11 in three runs: this data does not pin it down.',
    sources: [simReadme, mujocoActuator],
  },
  {
    id: 'spread',
    title: 'Turn the fit into ranges',
    what: 'Refit each episode on its own. The spread across episodes is evidence for a randomisation range, and the range the policy trained with can be checked against it.',
    budget: 'Gain 32.6–38.7 (10th–90th percentile of 20 episodes): inside the training range of 30–70. Joint friction 0.22–0.28: outside the training range of 0.05–0.2.',
    failure: 'One arm and one task. The spread measures episode-to-episode variation, not arm-to-arm.',
    sources: [simReadme],
  },
  {
    id: 'check',
    title: 'Check whether it matters',
    what: 'Make the fitted servo a held-out test cell and evaluate the policies you already have on it, before retraining anything.',
    budget: 'Lift success on the fitted servo: scripted expert 0.97, PPO trained on nominal physics 0.996, PPO fine-tuned with randomisation 0.992. The same nominal PPO policy drops to 0.458 with 3 steps of action latency.',
    failure: 'Only the lift task and state-based policies. The image-based imitation policies have not been evaluated on this cell yet.',
    sources: [simReadme, rlReadme],
  },
]

export const fit = {
  rows: [
    { label: 'Model defaults, mid-range zeros', err: 0.37 },
    { label: 'Fitted zeros', err: 0.349 },
    { label: 'Fitted zeros and servo', err: 0.294 },
  ],
  caveat: 'Mean |sim − real| over the 5 arm joints, held-out episodes 40–49, degrees.',
  sources: [simReadme],
}
