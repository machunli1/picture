/**
 * 姿态检测工具类
 * 用于检测深蹲动作
 */

class PoseDetector {
  /**
   * 判断是否为深蹲动作
   * @param {Object} pose - posenet返回的姿态数据
   * @return {boolean} 是否为深蹲动作
   */
  static isSquatPose(pose) {
    if (!pose || !pose.keypoints) return false;
    
    // 获取关键点
    const keypoints = pose.keypoints;
    const leftHip = this.getKeypoint(keypoints, 'left_hip');
    const rightHip = this.getKeypoint(keypoints, 'right_hip');
    const leftKnee = this.getKeypoint(keypoints, 'left_knee');
    const rightKnee = this.getKeypoint(keypoints, 'right_knee');
    const leftAnkle = this.getKeypoint(keypoints, 'left_ankle');
    const rightAnkle = this.getKeypoint(keypoints, 'right_ankle');
    
    // 检查关键点置信度
    if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) {
      return false;
    }
    
    if (leftHip.score < 0.5 || rightHip.score < 0.5 || 
        leftKnee.score < 0.5 || rightKnee.score < 0.5 || 
        leftAnkle.score < 0.5 || rightAnkle.score < 0.5) {
      return false;
    }
    
    // 计算膝关节角度
    const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
    
    // 判断是否为深蹲姿势（膝关节角度小于一定值）
    // 正常站立时膝关节角度接近180度，深蹲时角度会变小
    const squatAngleThreshold = 120; // 可调节的阈值
    
    return leftKneeAngle < squatAngleThreshold && rightKneeAngle < squatAngleThreshold;
  }
  
  /**
   * 判断是否为站立姿势
   * @param {Object} pose - posenet返回的姿态数据
   * @return {boolean} 是否为站立姿势
   */
  static isStandPose(pose) {
    if (!pose || !pose.keypoints) return false;
    
    // 获取关键点
    const keypoints = pose.keypoints;
    const leftHip = this.getKeypoint(keypoints, 'left_hip');
    const rightHip = this.getKeypoint(keypoints, 'right_hip');
    const leftKnee = this.getKeypoint(keypoints, 'left_knee');
    const rightKnee = this.getKeypoint(keypoints, 'right_knee');
    const leftAnkle = this.getKeypoint(keypoints, 'left_ankle');
    const rightAnkle = this.getKeypoint(keypoints, 'right_ankle');
    
    // 检查关键点置信度
    if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) {
      return false;
    }
    
    if (leftHip.score < 0.5 || rightHip.score < 0.5 || 
        leftKnee.score < 0.5 || rightKnee.score < 0.5 || 
        leftAnkle.score < 0.5 || rightAnkle.score < 0.5) {
      return false;
    }
    
    // 计算膝关节角度
    const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
    
    // 判断是否为站立姿势（膝关节角度接近180度）
    const standAngleThreshold = 160; // 可调节的阈值
    
    return leftKneeAngle > standAngleThreshold && rightKneeAngle > standAngleThreshold;
  }
  
  /**
   * 根据关键点名称获取关键点坐标
   * @param {Array} keypoints - 关键点数组
   * @param {string} name - 关键点名称
   * @return {Object|null} 关键点坐标和置信度
   */
  static getKeypoint(keypoints, name) {
    const keypoint = keypoints.find(kp => kp.part === name);
    return keypoint ? {x: keypoint.position.x, y: keypoint.position.y, score: keypoint.score} : null;
  }
  
  /**
   * 计算由三个点组成的角度
   * @param {Object} a - 第一个点
   * @param {Object} b - 第二个点（顶点）
   * @param {Object} c - 第三个点
   * @return {number} 角度值（度）
   */
  static calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    
    return angle;
  }
  
  /**
   * 检测深蹲动作完成（从蹲下到站起的过程）
   * @param {Object} prevPose - 上一帧的姿态
   * @param {Object} currentPose - 当前帧的姿态
   * @return {boolean} 是否完成一次深蹲
   */
  static isSquatCompleted(prevPose, currentPose) {
    // 如果之前是蹲下姿势，现在是站立姿势，则认为完成了一次深蹲
    return this.isSquatPose(prevPose) && this.isStandPose(currentPose);
  }
}

export default PoseDetector;