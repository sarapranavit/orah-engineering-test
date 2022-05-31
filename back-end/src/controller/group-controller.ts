import { NextFunction, Request, Response } from "express"
import { getConnection, getRepository } from "typeorm"
import { Group } from "../entity/group.entity"
import { Roll } from "../entity/roll.entity"
import { GroupStudent }  from "../entity/group-student.entity"
import { StudentRollState } from "../entity/student-roll-state.entity"
import { CreateGroupInput, UpdateGroupInput } from "../interface/group.interface"
import { Student } from "../entity/student.entity"

export class GroupController {
  private groupRepository = getRepository(Group)
  private studentRepository = getRepository(Student)
  private rollRepository = getRepository(Roll)
  private groupStudentRepository = getRepository(GroupStudent)
  private studentRollStateRepository = getRepository(StudentRollState)

  async allGroups(request: Request, response: Response, next: NextFunction) {
    return this.groupRepository.find()
  }

  async createGroup(request: Request, response: Response, next: NextFunction) {
    // Task 1: 
    // Add a Group

    const { body: params } = request
    const createGroupInput: CreateGroupInput ={
      name: params.name,
      number_of_weeks: params.number_of_weeks,
      roll_states: params.roll_states,
      incidents: params.incidents,
      ltmt: params.ltmt
    }

    const group = new Group()
    group.prepareToCreate(createGroupInput)
    return this.groupRepository.save(group)
  }

  async updateGroup(request: Request, response: Response, next: NextFunction) {
    const { body: params } = request

    const updateGroupInput: UpdateGroupInput ={
      id: params.id,
      name: params.name,
      number_of_weeks: params.number_of_weeks,
      roll_states: params.roll_states,
      incidents: params.incidents,
      ltmt: params.ltmt
    }
    const result = await this.groupRepository.findOne(params.id);
    if(result) {
      result.prepareToUpdate(updateGroupInput)
      return this.groupRepository.save(result)
    }
    else {
      return "No groups Found"
    }
  }

  async removeGroup(request: Request, response: Response, next: NextFunction) {
    let groupToRemove = await this.groupRepository.findOne(request.params.id)
    return await this.groupRepository.remove(groupToRemove)
  }

  async getGroupStudents(request: Request, response: Response, next: NextFunction) {
    // Task 1: 
        
    // Return the list of Students that are in a Group
    const getGroupStudents = await this.studentRepository
                            .createQueryBuilder("student")
                            .select("id, first_name, last_name")
                            .addSelect("first_name || ' ' || last_name", "full_name")
                            .where(qb => {
                              const subQuery = qb.subQuery()
                              .select("group_student.student_id")
                              .from(GroupStudent, "group_student")
                              .where("group_student.group_id = :groupId")
                              .getQuery();
                              return "student.id IN" + subQuery;
                            })
                            .setParameter("groupId", 1)
                            .getRawMany();

    return getGroupStudents
  }


  async runGroupFilters(request: Request, response: Response, next: NextFunction) {
    // Task 2:
  
    try {
      // 1. Clear out the groups (delete all the students from the groups)
      await this.clearGroupStudents();

      // 2. For each group, query the student rolls to see which students match the filter for the group
      const groupList = await this.groupRepository.find();
      
      var response = []
      for (const groups of groupList){
        var obj = {}
        let res = await this.runRollFilter(groups)
        obj["groupId"] = groups.id;
        obj["student_Count"] = res;
        console.log("obj",obj);
        response.push(obj)
      }

      return response;

    }
    catch(error){
      throw error
    }
    // 3. Add the list of students that match the filter to the group
  }

  async runRollFilter(groups) {

    try {
      const noOfDays = groups.number_of_weeks * 7;
      const groupId = groups.id;
      const ltmt = groups.ltmt;
      const incidents = groups.incidents;
      const roll_states = groups.roll_states

      const rollList = await this.getRollFilterList(noOfDays)
      const studentGroupsList = await this.getStudentGroupsList(rollList,roll_states,ltmt, incidents)
  
      const studentGroupCount = studentGroupsList.length;
      await this.updateStudentGroupCount(studentGroupCount, groupId)
    
      if(studentGroupCount > 0) {
        const groupIdMap = studentGroupsList.map((element) => ({
          ...element,
          group_id: groupId
        }));

        await this.insertStudentGroupList(groupIdMap)
      }
      return studentGroupCount;
    }
    catch(error){
      throw error
    }    
  }

  async clearGroupStudents() {
    let deleteRes = await this.groupStudentRepository
    .createQueryBuilder('groupStudent')
    .delete()
    .from("group_student")
    .execute()
  }

  async getRollFilterList(noOfDays){
    const rollFilter = await this.rollRepository
      .createQueryBuilder('roll')
      .select("id")
      .where(`completed_at BETWEEN date('now', '-${noOfDays} days') AND date('now')`)
      .getRawMany();

      let rollList = [];
      if(rollFilter.length > 0) {
        rollFilter.map(x => rollList.push(x.id))
      }

      return rollList
  }

  async getStudentGroupsList(rollList, roll_states, ltmt, incidents){
    const roll_states_arr = roll_states.split(',')
    const query = this.studentRollStateRepository
    .createQueryBuilder("student_roll_state")
    .select("student_id")
    .addSelect("count(student_id)", "incident_count")
    .where("roll_id IN (:...ids)", {ids: rollList})
    .andWhere("state IN (:...states)", {states: roll_states_arr})
    .groupBy("student_id")
    if(ltmt && incidents){
      query.having(`count(student_id) ${ltmt} ${incidents}`)
    }
    const result = await query.getRawMany()
    return result
  }

  async updateStudentGroupCount(groupCount, groupId) {

    const updateRes = await this.groupRepository
    .createQueryBuilder("group")
    .update("group")
    .set({student_count: groupCount})
    .set({run_at: new Date()})
    .where("id = :id", {id: groupId})
    .execute()
  }

  async insertStudentGroupList(groupIdMap){

    const insertRes = await this.groupStudentRepository
    .createQueryBuilder("groupStudent")
    .insert()
    .into("group_student")
    .values(groupIdMap)
    .execute()
  }
}
