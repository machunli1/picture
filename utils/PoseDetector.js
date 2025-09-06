/**
 * 姿态检测工具类
 * 使用MediaPipe进行深蹲动作检测
 */

class PoseDetector {
  /**
   * 判断是否为深蹲动作
   * @param {Object} landmarks - MediaPipe返回的姿态关键点数据
   * @return {boolean} 是否为深蹲动作
   */
  static isSquatPose(landmarks) {
    if (!landmarks) return false;
    
    // MediaPipe BlazePose关键点索引
    const LEFT_HIP = 24;
    const RIGHT_HIP = 23;
    const LEFT_KNEE = 26;
    const RIGHT_KNEE = 25;
    const LEFT_ANKLE = 28;
    const RIGHT_ANKLE = 27;
    
    // 检查关键点是否存在
    if (!landmarks[LEFT_HIP] || !landmarks[RIGHT_HIP] || 
        !landmarks[LEFT_KNEE] || !landmarks[RIGHT_KNEE] || 
        !landmarks[LEFT_ANKLE] || !landmarks[RIGHT_ANKLE]) {
      return false;
    }
    
    // 计算膝关节角度
    const leftKneeAngle = this.calculateAngle(
      landmarks[LEFT_HIP], 
      landmarks[LEFT_KNEE], 
      landmarks[LEFT_ANKLE]
    );
    
    const rightKneeAngle = this.calculateAngle(
      landmarks[RIGHT_HIP], 
      landmarks[RIGHT_KNEE], 
      landmarks[RIGHT_ANKLE]
    );
    
    // 深蹲时膝关节角度应该小于阈值
    const squatAngleThreshold = 120;
    return leftKneeAngle < squatAngleThreshold && rightKneeAngle < squatAngleThreshold;
  }
  
  /**
   * 判断是否为站立姿势
   * @param {Object} landmarks - MediaPipe返回的姿态关键点数据
   * @return {boolean} 是否为站立姿势
   */
  static isStandPose(landmarks) {
    if (!landmarks) return false;
    
    // MediaPipe BlazePose关键点索引
    const LEFT_HIP = 24;
    const RIGHT_HIP = 23;
    const LEFT_KNEE = 26;
    const RIGHT_KNEE = 25;
    const LEFT_ANKLE = 28;
    const RIGHT_ANKLE = 27;
    
    // 检查关键点是否存在
    if (!landmarks[LEFT_HIP] || !landmarks[RIGHT_HIP] || 
        !landmarks[LEFT_KNEE] || !landmarks[RIGHT_KNEE] || 
        !landmarks[LEFT_ANKLE] || !landmarks[RIGHT_ANKLE]) {
      return false;
    }
    
    // 计算膝关节角度
    const leftKneeAngle = this.calculateAngle(
      landmarks[LEFT_HIP], 
      landmarks[LEFT_KNEE], 
      landmarks[LEFT_ANKLE]
    );
    
    const rightKneeAngle = this.calculateAngle(
      landmarks[RIGHT_HIP], 
      landmarks[RIGHT_KNEE], 
      landmarks[RIGHT_ANKLE]
    );
    
    // 站立时膝关节角度应该接近180度
    const standAngleThreshold = 160;
    return leftKneeAngle > standAngleThreshold && rightKneeAngle > standAngleThreshold;
  }
  
  /**
   * 计算由三个点组成的角度
   * @param {Object} a - 第一个点
   * @param {Object} b - 第二个点（顶点）
   * @param {Object} c - 第三个点
   * @return {number} 角度值（度）
   */
  static calculateAngle(a, b, c) {
    if (!a || !b || !c) return 0;
    
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    
    return angle;
  }
  
  /**
   * 检测深蹲动作完成（从蹲下到站起的过程）
   * @param {Object} prevLandmarks - 上一帧的姿态关键点
   * @param {Object} currentLandmarks - 当前帧的姿态关键点
   * @return {boolean} 是否完成一次深蹲
   */
  static isSquatCompleted(prevLandmarks, currentLandmarks) {
    if (!prevLandmarks || !currentLandmarks) return false;
    
    // 如果之前是蹲下姿势，现在是站立姿势，则认为完成了一次深蹲
    return this.isSquatPose(prevLandmarks) && this.isStandPose(currentLandmarks);
  }
}

export default PoseDetector;