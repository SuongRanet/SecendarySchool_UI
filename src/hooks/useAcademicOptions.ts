import { useEffect, useState } from 'react';
import {
  academicYearService,
  classService,
  gradeLevelService,
  roomService,
  subjectService,
} from '@/services/academic.service';
import { teacherService } from '@/services/people.service';
import type { AcademicYear, GradeLevel, Room, SchoolClass, Subject, Teacher } from '@/types/entities';

export interface AcademicOptions {
  academicYears: AcademicYear[];
  activeYear: AcademicYear | null;
  gradeLevels: GradeLevel[];
  subjects: Subject[];
  rooms: Room[];
  teachers: Teacher[];
  isLoading: boolean;
}

/**
 * Loads the reference lists that most academic forms need. They change rarely, so
 * every page fetches them once on mount rather than per keystroke.
 */
export const useAcademicOptions = (
  include: {
    years?: boolean;
    gradeLevels?: boolean;
    subjects?: boolean;
    rooms?: boolean;
    teachers?: boolean;
  } = {},
): AcademicOptions => {
  const {
    years = true,
    gradeLevels = true,
    subjects = false,
    rooms = false,
    teachers = false,
  } = include;

  const [state, setState] = useState<AcademicOptions>({
    academicYears: [],
    activeYear: null,
    gradeLevels: [],
    subjects: [],
    rooms: [],
    teachers: [],
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [academicYears, gradeLevelList, subjectList, roomList, teacherList] = await Promise.all([
        years ? academicYearService.options().catch(() => []) : Promise.resolve([]),
        gradeLevels
          ? gradeLevelService.list({ isActive: true }).catch(() => [])
          : Promise.resolve([]),
        subjects ? subjectService.options().catch(() => []) : Promise.resolve([]),
        rooms ? roomService.options().catch(() => []) : Promise.resolve([]),
        teachers ? teacherService.options().catch(() => []) : Promise.resolve([]),
      ]);

      if (cancelled) {
        return;
      }

      setState({
        academicYears,
        activeYear: academicYears.find((year) => year.isActive) ?? academicYears[0] ?? null,
        gradeLevels: gradeLevelList,
        subjects: subjectList,
        rooms: roomList,
        teachers: teacherList,
        isLoading: false,
      });
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [years, gradeLevels, subjects, rooms, teachers]);

  return state;
};

/** Loads the classes of one academic year, for class pickers. */
export const useClassOptions = (
  academicYearId?: number,
): { classes: SchoolClass[]; isLoading: boolean } => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    classService
      .options(academicYearId ? { academicYearId } : {})
      .then((result) => {
        if (!cancelled) {
          setClasses(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setClasses([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [academicYearId]);

  return { classes, isLoading };
};
